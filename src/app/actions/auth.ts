"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, sessions, type UserPermissions } from "@/db/schema";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { OWNER_PERMISSIONS, MANAGER_PERMISSIONS, SALE_PERMISSIONS, mergeWithDefaults } from "@/lib/permissions";

export type AuthState = { error: string | null };

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "owner",
    permissions: OWNER_PERMISSIONS,
  }).returning({ id: users.id });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ------------------------------------------------------------------ */
/* Staff management (Owner-only)                                       */
/* ------------------------------------------------------------------ */

export type StaffState = { error: string | null; success?: boolean };

export async function createStaffAction(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only owners can add staff." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "sale");

  if (name.length < 2) return { error: "Please enter a name (at least 2 characters)." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (!["manager", "sale"].includes(role)) return { error: "Invalid role." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return { error: "An account with this email already exists." };

  const permissions = role === "manager" ? MANAGER_PERMISSIONS : SALE_PERMISSIONS;
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ name, email, passwordHash, role, permissions });

  revalidatePath("/staff");
  return { error: null, success: true };
}

export async function updateStaffPermissionsAction(
  staffId: number,
  permissions: Partial<UserPermissions>,
): Promise<StaffState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only owners can modify staff permissions." };
  if (actor.id === staffId) return { error: "You cannot modify your own permissions here." };

  const [staff] = await db.select({ role: users.role, permissions: users.permissions }).from(users).where(eq(users.id, staffId)).limit(1);
  if (!staff) return { error: "Staff member not found." };
  if (staff.role === "owner") return { error: "Cannot modify another owner's permissions." };

  const merged = mergeWithDefaults(staff.role, { ...(staff.permissions as UserPermissions), ...permissions });
  await db.update(users).set({ permissions: merged }).where(eq(users.id, staffId));

  revalidatePath("/staff");
  return { error: null, success: true };
}

export async function updateStaffRoleAction(
  staffId: number,
  role: "manager" | "sale",
): Promise<StaffState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only owners can change staff roles." };
  if (actor.id === staffId) return { error: "You cannot change your own role." };

  const [staff] = await db.select({ role: users.role }).from(users).where(eq(users.id, staffId)).limit(1);
  if (!staff) return { error: "Staff member not found." };
  if (staff.role === "owner") return { error: "Cannot change another owner's role." };

  const permissions = role === "manager" ? MANAGER_PERMISSIONS : SALE_PERMISSIONS;
  await db.update(users).set({ role, permissions }).where(eq(users.id, staffId));

  revalidatePath("/staff");
  return { error: null, success: true };
}

export async function deleteStaffAction(staffId: number): Promise<StaffState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only owners can remove staff." };
  if (actor.id === staffId) return { error: "You cannot delete your own account." };

  const [staff] = await db.select({ role: users.role }).from(users).where(eq(users.id, staffId)).limit(1);
  if (!staff) return { error: "Staff member not found." };
  if (staff.role === "owner") return { error: "Cannot delete another owner account." };

  // Delete sessions first (cascade should handle this but be explicit)
  await db.delete(sessions).where(eq(sessions.userId, staffId));
  await db.delete(users).where(eq(users.id, staffId));

  revalidatePath("/staff");
  return { error: null, success: true };
}

export async function resetStaffPasswordAction(
  staffId: number,
  newPassword: string,
): Promise<StaffState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only owners can reset staff passwords." };
  if (newPassword.length < 6) return { error: "Password must be at least 6 characters." };

  const [staff] = await db.select({ role: users.role }).from(users).where(eq(users.id, staffId)).limit(1);
  if (!staff) return { error: "Staff member not found." };
  if (staff.role === "owner") return { error: "Cannot reset another owner's password." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, staffId));

  revalidatePath("/staff");
  return { error: null, success: true };
}
