import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getCustomerById } from "@/lib/customer/queries";
import { customerIdSchema } from "@/lib/customer/validation";
import { ArchiveToggleButton } from "./archive-toggle-button";
import { getMaskedCustomerIdentity, listMaskedCustomerBankAccounts } from "@/lib/sensitive-data/service";
import { CustomerIdentityCard } from "./customer-identity-card";
import { CustomerBankAccountsCard } from "./customer-bank-accounts-card";

export default async function CustomerDetailPage({
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

  // Fetch sensitive identity & bank accounts records
  const identity = await getMaskedCustomerIdentity(customer.id);
  const bankAccounts = await listMaskedCustomerBankAccounts(customer.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2A2A2A] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F0E8]">
              {customer.fullName}
            </h1>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-[#C8B88A]/10 text-[#C8B88A] border border-[#C8B88A]/30">
              {customer.customerCode}
            </span>
            {customer.isArchived ? (
              <span className="text-xs px-2.5 py-0.5 rounded font-semibold bg-red-950/80 text-red-300 border border-red-800/80">
                Archived / Inactive
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                Active Customer
              </span>
            )}
          </div>
          <p className="text-xs text-[#E8E0D4]/60 mt-1">
            Created on {new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} by {customer.createdByAdmin?.name ?? "System"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/customers"
            className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#E8E0D4]/80 hover:text-[#F5F0E8] hover:bg-[#2A2A2A] transition-colors min-h-[44px] flex items-center"
          >
            ← Back to Customers
          </Link>
          <Link
            href={`/admin/customers/${customer.id}/edit`}
            className="rounded-lg border border-[#C8B88A]/40 bg-[#C8B88A]/10 px-4 py-2 text-sm font-medium text-[#C8B88A] hover:bg-[#C8B88A]/20 transition-colors min-h-[44px] flex items-center"
          >
            Edit Customer
          </Link>
          <ArchiveToggleButton
            customerId={customer.id}
            isArchived={customer.isArchived}
            expectedUpdatedAt={customer.updatedAt}
          />
        </div>
      </div>

      {/* Sensitive Cards Section (NID Identity & Bank Accounts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerIdentityCard customerId={customer.id} initialIdentity={identity} />
        <CustomerBankAccountsCard customerId={customer.id} initialBankAccounts={bankAccounts} />
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & Core Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details Card */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C8B88A] border-b border-[#2A2A2A] pb-2">
              Contact & Communication
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-[#E8E0D4]/50 mb-0.5">Primary Phone</span>
                <span className="font-mono text-[#F5F0E8] font-medium">{customer.phone}</span>
                <span className="block text-[11px] text-[#E8E0D4]/40 mt-0.5 font-mono">
                  Normalized: {customer.phoneNormalized}
                </span>
              </div>

              <div>
                <span className="block text-xs text-[#E8E0D4]/50 mb-0.5">WhatsApp Number</span>
                <span className="font-mono text-[#F5F0E8] font-medium">
                  {customer.whatsappNumber ?? "Not provided"}
                </span>
              </div>

              <div>
                <span className="block text-xs text-[#E8E0D4]/50 mb-0.5">Email Address</span>
                <span className="text-[#F5F0E8] font-medium">
                  {customer.email ?? "Not provided"}
                </span>
              </div>

              <div>
                <span className="block text-xs text-[#E8E0D4]/50 mb-0.5">Emergency Contact</span>
                <span className="text-[#F5F0E8] font-medium">
                  {customer.emergencyContact ?? "Not provided"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#2A2A2A]/50">
              <span className="block text-xs text-[#E8E0D4]/50 mb-0.5">Father&apos;s Name</span>
              <span className="text-[#F5F0E8] font-medium">
                {customer.fatherName ?? "Not provided"}
              </span>
            </div>

            <div>
              <span className="block text-xs text-[#E8E0D4]/50 mb-0.5">Address</span>
              <p className="text-[#F5F0E8] font-medium whitespace-pre-wrap leading-relaxed">
                {customer.address ?? "Not provided"}
              </p>
            </div>
          </div>

          {/* Customer Roles */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C8B88A] border-b border-[#2A2A2A] pb-2">
              Assigned Customer Roles
            </h2>

            <div className="flex flex-wrap gap-2">
              {customer.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 rounded-md text-xs font-semibold bg-[#2A2A2A] text-[#F5F0E8] border border-[#3A3A3A]"
                >
                  {role.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Internal Notes & Audit Log Timeline */}
        <div className="space-y-6">
          {/* Internal Notes Card */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C8B88A] border-b border-[#2A2A2A] pb-2">
              Internal Admin Notes
            </h2>
            <p className="text-xs text-[#E8E0D4]/80 whitespace-pre-wrap leading-relaxed">
              {customer.internalNotes ?? "No internal notes recorded for this customer."}
            </p>
          </div>

          {/* Privacy Audit Timeline */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C8B88A] border-b border-[#2A2A2A] pb-2">
              Audit History Timeline
            </h2>

            {customer.auditHistory.length === 0 ? (
              <p className="text-xs text-[#E8E0D4]/50">No audit log entries recorded.</p>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-[#2A2A2A]">
                {customer.auditHistory.map((entry) => (
                  <div key={entry.id} className="relative pl-6 text-xs">
                    <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-[#1A1A1A] bg-[#C8B88A]" />
                    <div className="font-semibold text-[#F5F0E8]">{entry.detailsSummary}</div>
                    <div className="text-[11px] text-[#E8E0D4]/50 mt-0.5">
                      {new Date(entry.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} • {entry.adminName ?? "System"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
