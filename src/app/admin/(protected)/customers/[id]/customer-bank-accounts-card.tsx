"use client";

import { useState } from "react";
import type { MaskedCustomerBankAccountDTO, SensitiveRevealResult } from "@/lib/sensitive-data/types";
import { SensitiveRevealModal } from "./sensitive-reveal-modal";
import {
  createCustomerBankAccountAction,
  updateCustomerBankAccountMetadataAction,
  replaceCustomerBankAccountNumberAction,
  archiveCustomerBankAccountAction,
  restoreCustomerBankAccountAction,
  revealCustomerBankAccountNumberAction,
} from "./sensitive-actions";

interface CustomerBankAccountsCardProps {
  customerId: string;
  initialBankAccounts: MaskedCustomerBankAccountDTO[];
}

export function CustomerBankAccountsCard({
  customerId,
  initialBankAccounts,
}: CustomerBankAccountsCardProps) {
  const [accounts, setAccounts] = useState<MaskedCustomerBankAccountDTO[]>(initialBankAccounts);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MaskedCustomerBankAccountDTO | null>(null);
  const [replacingAccount, setReplacingAccount] = useState<MaskedCustomerBankAccountDTO | null>(null);
  const [revealingAccountId, setRevealingAccountId] = useState<string | null>(null);

  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const res = await createCustomerBankAccountAction(customerId, {
      bankName,
      accountHolderName,
      branchName: branchName || null,
      accountNumber,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setAccounts((prev) => [res.data, ...prev]);
      setBankName("");
      setAccountHolderName("");
      setBranchName("");
      setAccountNumber("");
      setIsAddModalOpen(false);
    }
  };

  const handleEditMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    setIsSubmitting(true);
    setError(null);

    const res = await updateCustomerBankAccountMetadataAction(editingAccount.id, {
      bankName,
      accountHolderName,
      branchName: branchName || null,
      expectedUpdatedAt: editingAccount.updatedAt,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setAccounts((prev) => prev.map((a) => (a.id === res.data.id ? res.data : a)));
      setEditingAccount(null);
    }
  };

  const handleReplaceNumberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingAccount) return;

    setIsSubmitting(true);
    setError(null);

    const res = await replaceCustomerBankAccountNumberAction(replacingAccount.id, {
      accountNumber,
      expectedUpdatedAt: replacingAccount.updatedAt,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setAccounts((prev) => prev.map((a) => (a.id === res.data.id ? res.data : a)));
      setAccountNumber("");
      setReplacingAccount(null);
    }
  };

  const handleToggleArchive = async (account: MaskedCustomerBankAccountDTO) => {
    setIsSubmitting(true);
    const action = account.isActive
      ? archiveCustomerBankAccountAction(account.id, { expectedUpdatedAt: account.updatedAt })
      : restoreCustomerBankAccountAction(account.id, { expectedUpdatedAt: account.updatedAt });

    const res = await action;
    setIsSubmitting(false);

    if (res.success) {
      setAccounts((prev) => prev.map((a) => (a.id === res.data.id ? res.data : a)));
    }
  };

  const handleReveal = async (password: string): Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }> => {
    if (!revealingAccountId) {
      return { success: false, error: "No account selected for reveal." };
    }
    return await revealCustomerBankAccountNumberAction(revealingAccountId, { password });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Customer Bank Accounts</h2>
          <p className="text-xs text-zinc-400">Optional settlement accounts with encrypted account numbers</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setBankName("");
            setAccountHolderName("");
            setBranchName("");
            setAccountNumber("");
            setIsAddModalOpen(true);
          }}
          className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Add Bank Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-400">No bank accounts recorded for this customer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`rounded-lg border p-4 space-y-3 ${
                acc.isActive ? "border-zinc-800 bg-zinc-900/30" : "border-zinc-900 bg-zinc-950/50 opacity-75"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-zinc-200">{acc.bankName}</h3>
                  <p className="text-xs text-zinc-400">Holder: {acc.accountHolderName}</p>
                  {acc.branchName && <p className="text-xs text-zinc-500">Branch: {acc.branchName}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                      acc.isActive
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {acc.isActive ? "Active" : "Archived"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-900">
                <div>
                  <span className="block text-xs text-zinc-500 uppercase tracking-wider font-medium">Account Number</span>
                  <span className="font-mono text-sm text-zinc-200 font-semibold">{acc.maskedAccountNumber}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setEditingAccount(acc);
                      setBankName(acc.bankName);
                      setAccountHolderName(acc.accountHolderName);
                      setBranchName(acc.branchName || "");
                    }}
                    className="rounded-lg border border-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Edit Details
                  </button>

                  <button
                    onClick={() => {
                      setError(null);
                      setReplacingAccount(acc);
                      setAccountNumber("");
                    }}
                    className="rounded-lg border border-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Replace Number
                  </button>

                  <button
                    onClick={() => handleToggleArchive(acc)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    {acc.isActive ? "Archive" : "Restore"}
                  </button>

                  <button
                    onClick={() => setRevealingAccountId(acc.id)}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                  >
                    Reveal Number
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bank Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Add Customer Bank Account</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Account numbers are encrypted at rest using AES-256-GCM.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label htmlFor="bankNameInput" className="block text-sm font-medium text-zinc-300 mb-1">Bank Name</label>
                <input
                  id="bankNameInput"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Dutch-Bangla Bank"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="accountHolderInput" className="block text-sm font-medium text-zinc-300 mb-1">Account Holder Name</label>
                <input
                  id="accountHolderInput"
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="e.g. Sristy-Dristy Enterprise"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="branchNameInput" className="block text-sm font-medium text-zinc-300 mb-1">Branch Name (Optional)</label>
                <input
                  id="branchNameInput"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Mirpur-10 Branch"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="accountNumberInput" className="block text-sm font-medium text-zinc-300 mb-1">Account Number</label>
                <input
                  id="accountNumberInput"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  {isSubmitting ? "Encrypting & Adding..." : "Add Bank Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Edit Bank Account Details</h3>
            <p className="text-xs text-zinc-400 mb-4">Updates metadata only without re-encrypting account number.</p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleEditMetadataSubmit} className="space-y-4">
              <div>
                <label htmlFor="editBankName" className="block text-sm font-medium text-zinc-300 mb-1">Bank Name</label>
                <input
                  id="editBankName"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="editHolderName" className="block text-sm font-medium text-zinc-300 mb-1">Account Holder Name</label>
                <input
                  id="editHolderName"
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="editBranchName" className="block text-sm font-medium text-zinc-300 mb-1">Branch Name (Optional)</label>
                <input
                  id="editBranchName"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
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
                  {isSubmitting ? "Saving..." : "Update Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Account Number Modal */}
      {replacingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Replace Bank Account Number</h3>
            <p className="text-xs text-zinc-400 mb-4">Generates fresh IV and ciphertext for new account number.</p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleReplaceNumberSubmit} className="space-y-4">
              <div>
                <label htmlFor="replaceAccNo" className="block text-sm font-medium text-zinc-300 mb-1">New Account Number</label>
                <input
                  id="replaceAccNo"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 987654321098"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplacingAccount(null)}
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
                  {isSubmitting ? "Encrypting & Replacing..." : "Save New Number"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Reveal Modal */}
      <SensitiveRevealModal
        title="Reveal Full Bank Account Number"
        isOpen={Boolean(revealingAccountId)}
        onClose={() => setRevealingAccountId(null)}
        onRevealSubmit={handleReveal}
      />
    </div>
  );
}
