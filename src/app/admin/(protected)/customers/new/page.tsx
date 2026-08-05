import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = {
  title: "Add Customer | Admin Dashboard",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function NewCustomerPage() {
  await requireAdmin();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top breadcrumb navigation */}
      <div className="flex items-center gap-2 text-xs text-[#E8E0D4]/60">
        <Link href="/admin/customers" className="hover:text-[#F5F0E8] transition-colors">
          Customers
        </Link>
        <span>/</span>
        <span className="text-[#C8B88A]">New Customer</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-tight">Add New Customer</h1>
        <p className="text-sm text-[#E8E0D4]/70 mt-1">
          Create a new customer profile and assign business roles
        </p>
      </div>

      <CustomerForm />
    </div>
  );
}
