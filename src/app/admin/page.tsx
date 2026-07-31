import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Bike Management System",
  description: "Administration panel for Bike Management System",
  robots: "noindex, nofollow",
};

export default function AdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-12 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Bike Management System
          </h1>

          <p className="mt-4 text-sm font-medium text-gray-600">
            Admin Panel Foundation
          </p>

          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              Authentication and business modules are not implemented yet.
            </p>
          </div>

          <p className="mt-6 text-xs text-gray-400">Phase 0 — Foundation</p>
        </div>
      </div>
    </div>
  );
}
