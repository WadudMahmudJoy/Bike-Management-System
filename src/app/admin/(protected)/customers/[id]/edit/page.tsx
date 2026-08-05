import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getCustomerById } from "@/lib/customer/queries";
import { CustomerForm } from "../../customer-form";

export const metadata: Metadata = {
  title: "Edit Customer | Admin Dashboard",
  robots: { index: false, follow: false, noarchive: true },
};

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  await requireAdmin();

  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#E8E0D4]/60">
        <Link href="/admin/customers" className="hover:text-[#F5F0E8] transition-colors">
          Customers
        </Link>
        <span>/</span>
        <Link href={`/admin/customers/${customer.id}`} className="hover:text-[#F5F0E8] transition-colors font-mono">
          {customer.customerCode}
        </Link>
        <span>/</span>
        <span className="text-[#C8B88A]">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-tight">
          Edit Customer — {customer.fullName}
        </h1>
        <p className="text-sm text-[#E8E0D4]/70 mt-1">
          Code: <span className="font-mono text-[#C8B88A] font-semibold">{customer.customerCode}</span>
        </p>
      </div>

      <CustomerForm initialData={customer} />
    </div>
  );
}
