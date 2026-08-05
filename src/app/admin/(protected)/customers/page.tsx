import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getCustomerList } from "@/lib/customer/queries";
import type { CustomerRoleType, NidStatus } from "@/lib/customer/types";

interface CustomerPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    role?: string;
    nidStatus?: string;
    archiveFilter?: string;
    sortOrder?: string;
  }>;
}

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "POTENTIAL_BUYER", label: "Potential Buyer" },
  { value: "POTENTIAL_SELLER", label: "Potential Seller" },
  { value: "BIKE_REQUESTER", label: "Bike Requester" },
];

const NID_STATUS_OPTIONS = [
  { value: "", label: "All NID Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

export default async function CustomerListPage({ searchParams }: CustomerPageProps) {
  // Explicit server-side authorization check before querying customer records
  await requireAdmin();

  const params = await searchParams;

  const result = await getCustomerList({
    page: params.page ? parseInt(params.page, 10) : 1,
    query: params.query,
    role: params.role as CustomerRoleType | undefined,
    nidStatus: params.nidStatus as NidStatus | undefined,
    archiveFilter: (params.archiveFilter as "active" | "archived" | "all") || "active",
    sortOrder: (params.sortOrder as "desc" | "asc") || "desc",
  });

  const { customers, total, page, totalPages } = result;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2A2A2A] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F0E8]">
            Customer Management
          </h1>
          <p className="text-xs text-[#E8E0D4]/60 mt-1">
            Manage buyers, sellers, potential clients, and customer records.
          </p>
        </div>

        <Link
          href="/admin/customers/new"
          className="inline-flex items-center justify-center rounded-lg bg-[#C8B88A] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D8C89A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8B88A]/50 min-h-[44px]"
        >
          + Add New Customer
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <form method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label htmlFor="query" className="sr-only">Search</label>
            <input
              type="text"
              id="query"
              name="query"
              defaultValue={params.query ?? ""}
              placeholder="Search by code, name, or phone..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[40px]"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label htmlFor="role" className="sr-only">Role Filter</label>
            <select
              id="role"
              name="role"
              defaultValue={params.role ?? ""}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C8B88A] focus:outline-none min-h-[40px]"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* NID Status Filter */}
          <div>
            <label htmlFor="nidStatus" className="sr-only">NID Status</label>
            <select
              id="nidStatus"
              name="nidStatus"
              defaultValue={params.nidStatus ?? ""}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C8B88A] focus:outline-none min-h-[40px]"
            >
              {NID_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <select
              name="archiveFilter"
              defaultValue={params.archiveFilter ?? "active"}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-2.5 py-2 text-sm text-[#F5F0E8] focus:border-[#C8B88A] focus:outline-none min-h-[40px]"
            >
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
              <option value="all">All Statuses</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-[#2A2A2A] px-3.5 py-2 text-sm font-semibold text-[#F5F0E8] hover:bg-[#3A3A3A] transition-colors min-h-[40px]"
            >
              Filter
            </button>

            <Link
              href="/admin/customers"
              className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#E8E0D4]/70 hover:text-[#F5F0E8] hover:bg-[#2A2A2A] transition-colors min-h-[40px] flex items-center"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* Customer List Table */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#F5F0E8]">
            <thead className="bg-[#0A0A0A] text-xs uppercase tracking-wider text-[#E8E0D4]/60 border-b border-[#2A2A2A]">
              <tr>
                <th scope="col" className="px-6 py-3.5">Customer Code</th>
                <th scope="col" className="px-6 py-3.5">Full Name</th>
                <th scope="col" className="px-6 py-3.5">Masked Phone</th>
                <th scope="col" className="px-6 py-3.5">Assigned Roles</th>
                <th scope="col" className="px-6 py-3.5">NID Status</th>
                <th scope="col" className="px-6 py-3.5">Status</th>
                <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]/60">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#E8E0D4]/40 text-sm">
                    No customer records match your filter criteria.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-[#C8B88A]">
                      {customer.customerCode}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#F5F0E8]">
                      {customer.fullName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#E8E0D4]/80">
                      {customer.maskedPhone}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {customer.roles.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#2A2A2A] text-[#E8E0D4]/90 border border-[#3A3A3A]"
                          >
                            {role.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                        {customer.nidStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {customer.isArchived ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60">
                          Archived
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="rounded px-3 py-1 text-xs font-semibold text-[#C8B88A] hover:bg-[#C8B88A]/10 transition-colors border border-[#C8B88A]/30"
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-[#2A2A2A] px-6 py-4 bg-[#0A0A0A] text-xs text-[#E8E0D4]/60">
          <div>
            Showing total <span className="font-semibold text-[#F5F0E8]">{total}</span> customer records
          </div>

          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/admin/customers?page=${page - 1}${params.query ? `&query=${encodeURIComponent(params.query)}` : ""}${params.role ? `&role=${params.role}` : ""}${params.archiveFilter ? `&archiveFilter=${params.archiveFilter}` : ""}`}
                className="rounded border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#F5F0E8] hover:bg-[#2A2A2A]"
              >
                ← Previous
              </Link>
            )}
            <span>
              Page <span className="font-semibold text-[#F5F0E8]">{page}</span> of{" "}
              <span className="font-semibold text-[#F5F0E8]">{totalPages}</span>
            </span>
            {page < totalPages && (
              <Link
                href={`/admin/customers?page=${page + 1}${params.query ? `&query=${encodeURIComponent(params.query)}` : ""}${params.role ? `&role=${params.role}` : ""}${params.archiveFilter ? `&archiveFilter=${params.archiveFilter}` : ""}`}
                className="rounded border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#F5F0E8] hover:bg-[#2A2A2A]"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
