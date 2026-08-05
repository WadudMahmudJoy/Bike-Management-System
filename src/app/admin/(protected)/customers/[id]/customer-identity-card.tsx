"use client";

import { useState } from "react";
import type { MaskedCustomerIdentityDTO, SensitiveRevealResult } from "@/lib/sensitive-data/types";
import { SensitiveRevealModal } from "./sensitive-reveal-modal";
import {
  submitCustomerNidAction,
  replaceCustomerNidAction,
  markCustomerNidVerifiedAction,
  markCustomerNidNeedsCorrectionAction,
  revealCustomerNidAction,
} from "./sensitive-actions";

interface CustomerIdentityCardProps {
  customerId: string;
  initialIdentity: MaskedCustomerIdentityDTO | null;
}

export function CustomerIdentityCard({
  customerId,
  initialIdentity,
}: CustomerIdentityCardProps) {
  const [identity, setIdentity] = useState<MaskedCustomerIdentityDTO | null>(initialIdentity);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);

  const [nidInput, setNidInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusColors = {
    PENDING: "bg-zinc-800 text-zinc-400 border-zinc-700",
    SUBMITTED: "bg-blue-950/60 text-blue-400 border-blue-800",
    VERIFIED: "bg-emerald-950/60 text-emerald-400 border-emerald-800",
    NEEDS_CORRECTION: "bg-amber-950/60 text-amber-400 border-amber-800",
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nidInput.trim()) {
      setError("Please enter a National ID number.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const action = identity?.hasEncryptedData
      ? replaceCustomerNidAction(customerId, {
          nidNumber: nidInput,
          expectedUpdatedAt: identity.updatedAt,
        })
      : submitCustomerNidAction(customerId, { nidNumber: nidInput });

    const res = await action;
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setIdentity(res.data);
      setNidInput("");
      setIsSubmitModalOpen(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) return;

    setIsSubmitting(true);
    setError(null);

    const res = await markCustomerNidVerifiedAction(customerId, {
      expectedUpdatedAt: identity.updatedAt,
      notes: notesInput.trim() || null,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setIdentity(res.data);
      setNotesInput("");
      setIsVerifyModalOpen(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) return;

    setIsSubmitting(true);
    setError(null);

    const res = await markCustomerNidNeedsCorrectionAction(customerId, {
      expectedUpdatedAt: identity.updatedAt,
      notes: notesInput.trim() || null,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setIdentity(res.data);
      setNotesInput("");
      setIsCorrectionModalOpen(false);
    }
  };

  const handleReveal = async (password: string): Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }> => {
    return await revealCustomerNidAction(customerId, { password });
  };

  const currentStatus = identity?.nidStatus ?? "PENDING";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">National ID Identity</h2>
          <p className="text-xs text-zinc-400">Encrypted identity verification record</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              statusColors[currentStatus]
            }`}
          >
            {currentStatus.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-900 bg-zinc-900/40 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs text-zinc-500 uppercase tracking-wider font-medium">NID Number</span>
            <span className="font-mono text-base text-zinc-200 font-semibold">
              {identity?.maskedNid ? identity.maskedNid : "No NID on file"}
            </span>
          </div>

          <div>
            <span className="block text-xs text-zinc-500 uppercase tracking-wider font-medium">Submitted At</span>
            <span className="text-sm text-zinc-300">
              {identity?.submittedAt ? new Date(identity.submittedAt).toLocaleString() : "Not submitted"}
            </span>
          </div>

          {identity?.verifiedAt && (
            <div>
              <span className="block text-xs text-zinc-500 uppercase tracking-wider font-medium">Verified At</span>
              <span className="text-sm text-zinc-300">
                {new Date(identity.verifiedAt).toLocaleString()}
                {identity.verifiedByAdmin && ` by ${identity.verifiedByAdmin.name}`}
              </span>
            </div>
          )}

          {identity?.notes && (
            <div className="md:col-span-2">
              <span className="block text-xs text-zinc-500 uppercase tracking-wider font-medium">Notes</span>
              <span className="text-sm text-zinc-300">{identity.notes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {currentStatus === "PENDING" && (
          <button
            onClick={() => {
              setError(null);
              setNidInput("");
              setIsSubmitModalOpen(true);
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Submit NID Number
          </button>
        )}

        {currentStatus !== "PENDING" && (
          <>
            <button
              onClick={() => {
                setError(null);
                setNidInput("");
                setIsSubmitModalOpen(true);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Replace NID
            </button>

            {currentStatus === "SUBMITTED" && (
              <button
                onClick={() => {
                  setError(null);
                  setNotesInput("");
                  setIsVerifyModalOpen(true);
                }}
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Mark Verified
              </button>
            )}

            {(currentStatus === "SUBMITTED" || currentStatus === "VERIFIED") && (
              <button
                onClick={() => {
                  setError(null);
                  setNotesInput("");
                  setIsCorrectionModalOpen(true);
                }}
                className="rounded-lg bg-amber-600/80 px-3.5 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Needs Correction
              </button>
            )}

            {currentStatus === "NEEDS_CORRECTION" && (
              <button
                onClick={() => {
                  setError(null);
                  setNidInput("");
                  setIsSubmitModalOpen(true);
                }}
                className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Submit Corrected NID
              </button>
            )}

            <button
              onClick={() => setIsRevealModalOpen(true)}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 ml-auto"
            >
              Reveal Full NID
            </button>
          </>
        )}
      </div>

      {/* Submit / Replace Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              {identity?.hasEncryptedData ? "Replace National ID Number" : "Submit National ID Number"}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Supports Bangladesh 10, 13, or 17-digit NID. Stored encrypted at rest using AES-256-GCM.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="nidInput" className="block text-sm font-medium text-zinc-300 mb-1">
                  NID Number
                </label>
                <input
                  id="nidInput"
                  type="text"
                  value={nidInput}
                  onChange={(e) => setNidInput(e.target.value)}
                  placeholder="e.g. 19901234567890123"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Encrypting & Saving..." : "Save NID Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Mark Identity Verified</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Confirms manual physical or document verification of this customer&apos;s NID.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label htmlFor="verifyNotesInput" className="block text-sm font-medium text-zinc-300 mb-1">
                  Verification Notes (Optional)
                </label>
                <textarea
                  id="verifyNotesInput"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Add any verification details..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Confirm Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Needs Correction Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Mark Needs Correction</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Flag this NID identity record for correction or re-submission.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label htmlFor="correctionNotesInput" className="block text-sm font-medium text-zinc-300 mb-1">
                  Correction Reason / Notes
                </label>
                <textarea
                  id="correctionNotesInput"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Specify why correction is needed..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Flag for Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reveal Modal */}
      <SensitiveRevealModal
        title="Reveal Full National ID Number"
        isOpen={isRevealModalOpen}
        onClose={() => setIsRevealModalOpen(false)}
        onRevealSubmit={handleReveal}
      />
    </div>
  );
}
