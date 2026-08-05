"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveCustomerAction, restoreCustomerAction } from "../actions";

interface ArchiveToggleButtonProps {
  customerId: string;
  isArchived: boolean;
  expectedUpdatedAt: string;
}

export function ArchiveToggleButton({
  customerId,
  isArchived,
  expectedUpdatedAt,
}: ArchiveToggleButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = isArchived
        ? await restoreCustomerAction(customerId, expectedUpdatedAt)
        : await archiveCustomerAction(customerId, expectedUpdatedAt);

      if (!res.success) {
        setIsSubmitting(false);
        setError(res.error);
        return;
      }

      setShowModal(false);
      setIsSubmitting(false);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] ${
          isArchived
            ? "border-emerald-700 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
            : "border-red-800 bg-red-950/40 text-red-300 hover:bg-red-900/60"
        }`}
      >
        {isArchived ? "Reactivate Customer" : "Archive Customer"}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl space-y-4 text-[#F5F0E8]">
            <h3 className="text-lg font-bold">
              {isArchived ? "Reactivate Customer Record" : "Archive Customer Record"}
            </h3>

            {error && (
              <div className="rounded bg-red-950/80 border border-red-800 p-3 text-xs text-red-200">
                {error}
              </div>
            )}

            <p className="text-sm text-[#E8E0D4]/80 leading-relaxed">
              {isArchived
                ? "This will restore the customer to active status. The customer will appear in active search filters."
                : "This will archive (deactivate) the customer. Historical financial records and transaction logs will be preserved."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#E8E0D4] hover:bg-[#2A2A2A] min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggle}
                disabled={isSubmitting}
                className={`rounded-lg px-4 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-50 ${
                  isArchived
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-red-600 text-white hover:bg-red-500"
                }`}
              >
                {isSubmitting ? "Processing..." : isArchived ? "Confirm Reactivate" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
