"use client";

import {
  Check,
  ChevronDown,
  KeyRound,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import {
  createStaffAction,
  deleteStaffAction,
  resetStaffPasswordAction,
  updateStaffPermissionsAction,
  updateStaffRoleAction,
  type StaffState,
} from "@/app/actions/auth";
import { Modal, PrimaryButton } from "@/components/ui";
import type { UserPermissions } from "@/db/schema";
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from "@/lib/permissions";

type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: unknown;
  createdAt: Date;
};

const ROLE_META = {
  manager: {
    label: "Manager",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  sale: {
    label: "Sale",
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
};

/* ------------------------------------------------------------------ */
/* Root client component                                               */
/* ------------------------------------------------------------------ */

export function StaffClient({ staff }: { staff: StaffMember[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-[900px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Staff</h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {staff.length} staff member{staff.length !== 1 ? "s" : ""} · Manage roles and access permissions
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--accent)" }}
        >
          <UserPlus size={16} />
          Add Staff
        </button>
      </header>

      {staff.length === 0 ? (
        <div className="anim-rise flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/40">
            <UserPlus size={22} strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-display text-[15px] font-semibold">No staff members yet</p>
          <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink/50">
            Add your first staff member to give them access to the POS system.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Add Staff
          </button>
        </div>
      ) : (
        <div className="anim-rise space-y-3">
          {staff.map((member, i) => (
            <StaffCard
              key={member.id}
              member={member}
              delay={i * 0.04}
              onDelete={() => setDeleteId(member.id)}
              onResetPassword={() => setResetId(member.id)}
            />
          ))}
        </div>
      )}

      {addOpen && <AddStaffModal onClose={() => setAddOpen(false)} />}
      {deleteId !== null && (
        <DeleteStaffModal
          staffId={deleteId}
          staffName={staff.find((s) => s.id === deleteId)?.name ?? ""}
          onClose={() => setDeleteId(null)}
        />
      )}
      {resetId !== null && (
        <ResetPasswordModal
          staffId={resetId}
          staffName={staff.find((s) => s.id === resetId)?.name ?? ""}
          onClose={() => setResetId(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Staff card with permission toggles                                  */
/* ------------------------------------------------------------------ */

function StaffCard({
  member,
  delay,
  onDelete,
  onResetPassword,
}: {
  member: StaffMember;
  delay: number;
  onDelete: () => void;
  onResetPassword: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [roleChanging, startRoleTransition] = useTransition();
  const [optimisticPerms, setOptimisticPerms] = useState<UserPermissions>(
    (member.permissions as UserPermissions) ?? {},
  );

  const roleMeta = ROLE_META[member.role as keyof typeof ROLE_META] ?? ROLE_META.sale;
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function togglePerm(key: PermissionKey) {
    const next = { ...optimisticPerms, [key]: !optimisticPerms[key] };
    setOptimisticPerms(next);
    startTransition(async () => {
      await updateStaffPermissionsAction(member.id, { [key]: next[key] });
    });
  }

  function changeRole(newRole: "manager" | "sale") {
    startRoleTransition(async () => {
      await updateStaffRoleAction(member.id, newRole);
    });
  }

  return (
    <div
      className="anim-rise overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-sm"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{member.name}</p>
          <p className="text-[12px] text-ink/45">{member.email}</p>
        </div>

        {/* Role badge + selector */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${roleMeta.color}`}
          >
            {roleMeta.label}
          </span>
          <div className="relative">
            <select
              defaultValue={member.role}
              onChange={(e) => changeRole(e.target.value as "manager" | "sale")}
              disabled={roleChanging}
              className="appearance-none rounded-lg border border-line bg-white py-1.5 pl-2.5 pr-7 text-[12px] font-semibold text-ink/70 outline-none transition hover:border-ink/25 focus:border-[var(--accent)]"
            >
              <option value="manager">Manager</option>
              <option value="sale">Sale</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink/40" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onResetPassword}
            title="Reset password"
            className="rounded-lg p-2 text-ink/35 transition hover:bg-ink/5 hover:text-ink/70"
          >
            <KeyRound size={15} />
          </button>
          <button
            onClick={onDelete}
            title="Remove staff"
            className="rounded-lg p-2 text-ink/35 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`rounded-lg p-2 transition hover:bg-ink/5 ${expanded ? "text-ink" : "text-ink/35"}`}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Permissions panel */}
      {expanded && (
        <div className="border-t border-line bg-ink/[0.02] px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/40">
              Access Permissions
            </p>
            {pending && <Loader2 size={12} className="animate-spin text-ink/40" />}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PERMISSION_KEYS.map((key) => {
              const info = PERMISSION_LABELS[key];
              const enabled = optimisticPerms[key] === true;
              return (
                <button
                  key={key}
                  onClick={() => togglePerm(key)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                    enabled
                      ? "border-transparent bg-emerald-50 text-emerald-900"
                      : "border-line bg-white text-ink/55 hover:border-ink/20"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                      enabled
                        ? "border-emerald-400 bg-emerald-400 text-white"
                        : "border-ink/20 bg-white"
                    }`}
                  >
                    {enabled && <Check size={9} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-tight">{info.label}</p>
                    <p className="mt-0.5 text-[11px] leading-tight opacity-60">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add Staff Modal                                                     */
/* ------------------------------------------------------------------ */

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const initState: StaffState = { error: null };
  const [state, formAction, pending] = useActionState(createStaffAction, initState);

  if (state.success) {
    onClose();
  }

  return (
    <Modal open onClose={pending ? () => {} : onClose} width="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between pr-2">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink/40">Add Staff Member</p>
        </div>
        <h2 className="mt-1 font-display text-xl font-semibold">New Staff Account</h2>

        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink/60">Full Name</label>
            <input
              name="name"
              required
              placeholder="e.g. John Smith"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink/60">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="e.g. john@bistrolumen.com"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink/60">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="Min. 6 characters"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink/60">Role</label>
            <div className="relative">
              <select
                name="role"
                defaultValue="sale"
                className="w-full appearance-none rounded-xl border border-line bg-white px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="sale">Sale — Basic POS access</option>
                <option value="manager">Manager — Extended access, no settings</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
            </div>
            <p className="mt-1.5 text-[11px] text-ink/40">
              Permissions can be fine-tuned after creation.
            </p>
          </div>

          {state.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:text-ink disabled:opacity-40"
            >
              <X size={16} />
            </button>
            <PrimaryButton type="submit" disabled={pending} busy={pending} className="flex-1">
              Create Account
            </PrimaryButton>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Delete Staff Modal                                                  */
/* ------------------------------------------------------------------ */

function DeleteStaffModal({
  staffId,
  staffName,
  onClose,
}: {
  staffId: number;
  staffName: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await deleteStaffAction(staffId);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <Modal open onClose={pending ? () => {} : onClose} width="max-w-sm">
      <div className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <ShieldAlert size={22} />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold">Remove {staffName}?</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
          This will permanently delete their account and sign them out of all devices. This cannot be undone.
        </p>
        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink/60 transition hover:text-ink disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={pending}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Reset Password Modal                                                */
/* ------------------------------------------------------------------ */

function ResetPasswordModal({
  staffId,
  staffName,
  onClose,
}: {
  staffId: number;
  staffName: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(null);
    startTransition(async () => {
      const res = await resetStaffPasswordAction(staffId, password);
      if (res.error) setError(res.error);
      else setSuccess(true);
    });
  }

  return (
    <Modal open onClose={pending ? () => {} : onClose} width="max-w-sm">
      <div className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.06] text-ink/60">
          <KeyRound size={22} />
        </div>
        {success ? (
          <>
            <div className="mt-4 flex items-center gap-2 text-emerald-600">
              <ShieldCheck size={18} />
              <h2 className="font-display text-lg font-semibold">Password reset!</h2>
            </div>
            <p className="mt-1.5 text-[13px] text-ink/55">
              {staffName}&apos;s password has been updated successfully.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-line py-2.5 text-sm font-semibold"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-4 font-display text-lg font-semibold">Reset {staffName}&apos;s Password</h2>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>
            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                disabled={pending}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink/60 transition hover:text-ink disabled:opacity-40"
              >
                Cancel
              </button>
              <PrimaryButton onClick={submit} disabled={pending} busy={pending} className="flex-1">
                Reset Password
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
