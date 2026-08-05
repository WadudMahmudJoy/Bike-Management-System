import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getCustomerById } from "@/lib/customer/queries";
import { customerIdSchema } from "@/lib/customer/validation";
import { mapDetailToEditDTO } from "@/lib/customer/types";
import { CustomerForm } from "@/app/admin/(protected)/customers/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Explicit server-side authorization check BEFORE resolving route parameter or querying database
  await requireAdmin();

  const { id } = await params;

  const idParsed = customerIdSchema.safeParse(id);
  if (!idParsed.success) {
    notFound();
  }

  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const editData = mapDetailToEditDTO(customer);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F0E8]">
            Edit Customer Record
          </h1>
          <p className="text-xs text-[#E8E0D4]/60 mt-1">
            Updating {customer.fullName} (<span className="font-mono text-[#C8B88A]">{customer.customerCode}</span>)
          </p>
        </div>

        <Link
          href={`/admin/customers/${customer.id}`}
          className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#E8E0D4]/80 hover:text-[#F5F0E8] hover:bg-[#2A2A2A] transition-colors min-h-[44px] flex items-center"
        >
          ← Cancel
        </Link>
      </div>

      <CustomerForm initialData={editData} />
    </div>
  );
}
