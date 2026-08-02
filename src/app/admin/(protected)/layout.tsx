import { requireAdmin } from "@/lib/auth/dal";
import { AdminShell } from "./admin-shell";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Secure server-side authorization - never rely on proxy alone
  const admin = await requireAdmin();

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
