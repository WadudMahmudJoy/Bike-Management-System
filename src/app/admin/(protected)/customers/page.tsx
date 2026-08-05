import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getCustomerList } from "@/lib/customer/queries";
import type { CustomerRoleType, NidStatus } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Customers | Admin Dashboard",
  robots: { index: false, follow: false, noarchive: true },
};

interface CustomersPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    role?: string;
    nidStatus?: string;
    archiveFilter?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const query = params.query ?? "";
  const role = (params.role as CustomerRoleType) || undefined;
  const nidStatus = (params.nidStatus as NidStatus) || undefined;
  const archiveFilter = (params.archiveFilter as "active" | "archived" | "all") || "active";

  const { customers, total, totalPages } = await getCustomerList({
    page,
    limit: 20,
    query,
    role,
    nidStatus,
    archiveFilter,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-tight">Customer Management</h1>
          <p className="text-sm text-[#E8E0D4]/70 mt-1">
            Manage customer profiles, roles, contact records, and identity statuses ({total} total)
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
          {/* Search input */}
          <div className="lg:col-span-2">
            <label htmlFor="query" className="block text-xs font-medium text-[#E8E0D4]/70 mb-1">
              Search
            </label>
            <input
              type="text"
              id="query"
              name="query"
              defaultValue={query}
              placeholder="Search code, name, or phone..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/40 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Role filter */}
          <div>
            <label htmlFor="role" className="block text-xs font-medium text-[#E8E0D4]/70 mb-1">
              Customer Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue={role ?? ""}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
            >
              <option value="">All Roles</option>
              <option value="BUYER">Buyer</option>
              <option value="SELLER">Seller</option>
              <option value="POTENTIAL_BUYER">Potential Buyer</option>
              <option value="POTENTIAL_SELLER">Potential Seller</option>
              <option value="BIKE_REQUESTER">Bike Requester</option>
            </select>
          </div>

          {/* NID Status filter */}
          <div>
            <label htmlFor="nidStatus" className="block text-xs font-medium text-[#E8E0D4]/70 mb-1">
              NID Status
            </label>
            <select
              id="nidStatus"
              name="nidStatus"
              defaultValue={nidStatus ?? ""}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
            >
              <option value="">All NID Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="NEEDS_CORRECTION">Needs Correction</option>
            </select>
          </div>

          {/* Archive Status filter */}
          <div>
            <label htmlFor="archiveFilter" className="block text-xs font-medium text-[#E8E0D4]/70 mb-1">
              State
            </label>
            <select
              id="archiveFilter"
              name="archiveFilter"
              defaultValue={archiveFilter}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
            >
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
              <option value="all">All Records</option>
            </select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-5 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-[#2A2A2A] px-4 py-2 text-sm font-medium text-[#F5F0E8] hover:bg-[#3A3A3A] transition-colors focus:outline-none focus:ring-1 focus:ring-[#C8B88A] min-h-[44px]"
            >
              Apply Filters
            </button>
            <Link
              href="/admin/customers"
              className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#E8E0D4]/70 hover:text-[#F5F0E8] hover:bg-[#2A2A2A] transition-colors min-h-[44px] flex items-center justify-center"
            >
              Clear Filters
            </Link>
          </div>
        </form>
      </div>

      {/* Customer Table */}
      <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#F5F0E8]">
            <thead className="border-b border-[#2A2A2A] bg-[#0A0A0A] text-xs font-semibold uppercase tracking-wider text-[#C8B88A]">
              <tr>
                <th scope="col" className="px-4 py-3.5">Code</th>
                <th scope="col" className="px-4 py-3.5">Name</th>
                <th scope="col" className="px-4 py-3.5">Masked Contact</th>
                <th scope="col" className="px-4 py-3.5">Roles</th>
                <th scope="col" className="px-4 py-3.5">NID Status</th>
                <th scope="col" className="px-4 py-3.5">State</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#E8E0D4]/60">
                    No customer records found matching the specified criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#C8B88A]">
                      {c.customerCode}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#F5F0E8]">
                      {c.fullName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#E8E0D4]/80">
                      {c.maskedPhone}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-block rounded bg-[#2A2A2A] px-2 py-0.5 text-[10px] font-medium text-[#C8B88A] border border-[#3A3A3A]"
                          >
                            {r.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block rounded-full bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-800/50">
                        {c.nidStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.isArchived ? (
                        <span className="inline-block rounded-full bg-red-950/60 px-2.5 py-0.5 text-[11px] font-medium text-red-400 border border-red-800/50">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-800/50">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="inline-block rounded border border-[#2A2A2A] px-2.5 py-1 text-xs font-medium text-[#E8E0D4] hover:bg-[#2A2A2A] hover:text-[#F5F0E8] transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/customers/${c.id}/edit`}
                        className="inline-block rounded border border-[#3A3A3A] px-2.5 py-1 text-xs font-medium text-[#C8B88A] hover:bg-[#C8B88A]/10 transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-3 text-xs text-[#E8E0D4]/70">
            <div>
              Page <span className="font-semibold text-[#F5F0E8]">{page}</span> of{" "}
              <span className="font-semibold text-[#F5F0E8]">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/customers?page=${page - 1}&query=${encodeURIComponent(query)}&role=${role ?? ""}&nidStatus=${nidStatus ?? ""}&archiveFilter=${archiveFilter}`}
                  className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1.5 font-medium text-[#F5F0E8] hover:bg-[#2A2A2A]"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/customers?page=${page + 1}&query=${encodeURIComponent(query)}&role=${role ?? ""}&nidStatus=${nidStatus ?? ""}&archiveFilter=${archiveFilter}`}
                  className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1.5 font-medium text-[#F5F0E8] hover:bg-[#2A2A2A]"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
