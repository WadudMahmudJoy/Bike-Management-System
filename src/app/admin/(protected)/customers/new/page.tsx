import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage() {
  // Explicit server-side authorization check
  await requireAdmin();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F0E8]">
            Create New Customer Record
          </h1>
          <p className="text-xs text-[#E8E0D4]/60 mt-1">
            Add a new buyer, seller, or potential client to the dealership directory.
          </p>
        </div>

        <Link
          href="/admin/customers"
          className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#E8E0D4]/80 hover:text-[#F5F0E8] hover:bg-[#2A2A2A] transition-colors min-h-[44px] flex items-center"
        >
          ← Cancel
        </Link>
      </div>

      <CustomerForm />
    </div>
  );
}
