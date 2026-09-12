import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStaffList } from "@/lib/queries";
import { StaffClient } from "@/components/staff/staff-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/dashboard");

  const staff = await getStaffList();

  return <StaffClient staff={staff} />;
}
