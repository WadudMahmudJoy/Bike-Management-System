import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin | Bike Management System",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminPage() {
  const session = await getCurrentAdminSession();
  if (session) {
    redirect("/admin/dashboard");
  }
  redirect("/admin/login");
}
