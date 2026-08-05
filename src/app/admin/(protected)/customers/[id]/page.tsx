import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getCustomerById } from "@/lib/customer/queries";
import { ArchiveToggleButton } from "./archive-toggle-button";

export const metadata: Metadata = {
  title: "Customer Details | Admin Dashboard",
  robots: { index: false, follow: false, noarchive: true },
};

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  await requireAdmin();

  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#E8E0D4]/60">
        <Link href="/admin/customers" className="hover:text-[#F5F0E8] transition-colors">
          Customers
        </Link>
        <span>/</span>
        <span className="text-[#C8B88A] font-mono">{customer.customerCode}</span>
      </div>

      {/* Header card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#C8B88A] bg-[#2A2A2A] px-2.5 py-1 rounded border border-[#3A3A3A]">
              {customer.customerCode}
            </span>
            <h1 className="text-2xl font-bold text-[#F5F0E8]">{customer.fullName}</h1>
            {customer.isArchived ? (
              <span className="rounded-full bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-400 border border-red-800/50">
                Archived
              </span>
            ) : (
              <span className="rounded-full bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800/50">
                Active
              </span>
            )}
            <span className="rounded-full bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-800/50">
              NID: {customer.nidStatus}
            </span>
          </div>
          <p className="text-xs text-[#E8E0D4]/60 mt-2">
            Created on {new Date(customer.createdAt).toLocaleDateString("en-GB", { dateStyle: "long" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/customers/${customer.id}/edit`}
            className="inline-flex items-center justify-center rounded-lg bg-[#C8B88A] px-4 py-2 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D8C89A] transition-colors min-h-[44px]"
          >
            Edit Profile
          </Link>
          <ArchiveToggleButton
            customerId={customer.id}
            isArchived={customer.isArchived}
            expectedUpdatedAt={customer.updatedAt}
          />
        </div>
      </div>

      {/* Main details grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Contact & Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#F5F0E8] border-b border-[#2A2A2A] pb-3">
              Profile &amp; Operational Contact Info
            </h2>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Full Name</dt>
                <dd className="mt-1 font-semibold text-[#F5F0E8]">{customer.fullName}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Father&apos;s Name</dt>
                <dd className="mt-1 text-[#F5F0E8]">{customer.fatherName || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Primary Phone</dt>
                <dd className="mt-1 font-mono text-[#C8B88A] font-semibold">{customer.phone}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">WhatsApp Number</dt>
                <dd className="mt-1 font-mono text-[#F5F0E8]">{customer.whatsappNumber || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Email Address</dt>
                <dd className="mt-1 text-[#F5F0E8]">{customer.email || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Emergency Contact</dt>
                <dd className="mt-1 text-[#F5F0E8]">{customer.emergencyContact || "—"}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Address</dt>
                <dd className="mt-1 text-[#F5F0E8] whitespace-pre-wrap">{customer.address || "—"}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs text-[#E8E0D4]/60 font-medium">Assigned Business Roles</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {customer.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded bg-[#2A2A2A] px-2.5 py-1 text-xs font-semibold text-[#C8B88A] border border-[#3A3A3A]"
                    >
                      {r.replace("_", " ")}
                    </span>
                  ))}
                </dd>
              </div>

              {customer.internalNotes && (
                <div className="sm:col-span-2 border-t border-[#2A2A2A] pt-4">
                  <dt className="text-xs text-[#E8E0D4]/60 font-medium">Internal Admin Notes</dt>
                  <dd className="mt-1 text-[#E8E0D4] bg-[#0A0A0A] p-3 rounded-lg border border-[#2A2A2A] text-xs leading-relaxed whitespace-pre-wrap">
                    {customer.internalNotes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right Column: Metadata & Audit Timeline */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#F5F0E8] border-b border-[#2A2A2A] pb-3">
              Record Metadata
            </h3>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[#E8E0D4]/60">Created By Admin</dt>
                <dd className="mt-0.5 font-medium text-[#F5F0E8]">
                  {customer.createdByAdmin?.name ?? "System / Unknown"}
                </dd>
              </div>

              <div>
                <dt className="text-[#E8E0D4]/60">Created At</dt>
                <dd className="mt-0.5 font-mono text-[#F5F0E8]">
                  {new Date(customer.createdAt).toLocaleString("en-GB")}
                </dd>
              </div>

              <div>
                <dt className="text-[#E8E0D4]/60">Last Updated</dt>
                <dd className="mt-0.5 font-mono text-[#F5F0E8]">
                  {new Date(customer.updatedAt).toLocaleString("en-GB")}
                </dd>
              </div>

              <div>
                <dt className="text-[#E8E0D4]/60">NID Status Lifecycle</dt>
                <dd className="mt-0.5 font-medium text-amber-400">
                  {customer.nidStatus} (No raw NID collected)
                </dd>
              </div>
            </dl>
          </div>

          {/* Audit History Timeline */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#F5F0E8] border-b border-[#2A2A2A] pb-3">
              Audit Event Log
            </h3>
            {customer.auditHistory.length === 0 ? (
              <p className="text-xs text-[#E8E0D4]/60">No audit events recorded.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {customer.auditHistory.map((log) => (
                  <div key={log.id} className="border-l-2 border-[#C8B88A] pl-3 py-1 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#C8B88A]">{log.action}</span>
                      <span className="text-[#E8E0D4]/50">{log.adminName}</span>
                    </div>
                    <p className="text-xs text-[#E8E0D4]/90">{log.detailsSummary}</p>
                    <p className="text-[10px] font-mono text-[#E8E0D4]/50">
                      {new Date(log.createdAt).toLocaleString("en-GB")}
                    </p>
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
