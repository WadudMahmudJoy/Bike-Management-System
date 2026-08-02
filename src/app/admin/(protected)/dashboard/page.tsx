import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F0E8] tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[#E8E0D4]/60">
          Sristy-Dristy Bike House Administration
        </p>
      </div>

      {/* Overview Card */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-xl shadow-black/30">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2A2A2A] border border-[#3A3A3A]">
            <svg
              className="h-6 w-6 text-[#C8B88A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-[#F5F0E8]">
                Phase 2 — Secure Admin Authentication & Shell
              </h2>
              <span className="inline-flex items-center rounded-md bg-[#C8B88A]/15 px-2 py-0.5 text-xs font-medium text-[#C8B88A] border border-[#C8B88A]/30">
                Active & Verified
              </span>
            </div>
            <p className="text-sm text-[#E8E0D4]/70 leading-relaxed max-w-3xl">
              Admin authentication, Argon2id credential hashing, database-backed sessions, rate-limited login throttling, authorization DAL, and Next.js proxy route protection are operational. Business modules (inventory, customer management, purchases, sales, and payments) will be enabled in subsequent phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
