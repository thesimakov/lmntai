import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaffPanel } from "@/lib/auth-guards";
import { parsePermissionList } from "@/lib/staff-permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const g = await requireStaffPanel();
  if (!g.ok) {
    redirect(g.status === 401 ? "/login" : "/playground");
  }
  const role = g.data.user.role === "ADMIN" ? "ADMIN" : "MANAGER";
  const permissionKeys = parsePermissionList(g.data.user.adminPermissions);
  return (
    <AdminShell role={role} permissionKeys={permissionKeys} email={g.data.user.email}>
      {children}
    </AdminShell>
  );
}
