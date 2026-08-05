"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomerAction, updateCustomerAction } from "./actions";
import type { CustomerDetailDTO, DuplicateWarningDTO, CustomerRoleType } from "@/lib/customer/types";

interface CustomerFormProps {
  initialData?: CustomerDetailDTO;
}

const ALL_ROLES: { value: CustomerRoleType; label: string }[] = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "POTENTIAL_BUYER", label: "Potential Buyer" },
  { value: "POTENTIAL_SELLER", label: "Potential Seller" },
  { value: "BIKE_REQUESTER", label: "Bike Requester" },
];

export function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);

  const [fullName, setFullName] = useState(initialData?.fullName ?? "");
  const [fatherName, setFatherName] = useState(initialData?.fatherName ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(initialData?.whatsappNumber ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [emergencyContact, setEmergencyContact] = useState(initialData?.emergencyContact ?? "");
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes ?? "");
  const [selectedRoles, setSelectedRoles] = useState<CustomerRoleType[]>(
    initialData?.roles ?? ["BUYER"]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarningDTO | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const toggleRole = (role: CustomerRoleType) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    overrideDuplicate = false,
    expectedDuplicateIds: string[] = []
  ) => {
    if (e) e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const res = await updateCustomerAction(initialData.id, {
          fullName,
          fatherName,
          phone,
          whatsappNumber,
          email,
          address,
          emergencyContact,
          internalNotes,
          roles: selectedRoles,
          expectedUpdatedAt: initialData.updatedAt,
          confirmDuplicate: overrideDuplicate,
          expectedDuplicateCustomerIds: expectedDuplicateIds,
        });

        if (!res.success) {
          setIsSubmitting(false);
          if (res.duplicateWarning?.hasDuplicates) {
            setDuplicateWarning(res.duplicateWarning);
            setShowDuplicateModal(true);
          } else {
            setError(res.error);
          }
          return;
        }

        router.push(`/admin/customers/${res.data.customerId}`);
        router.refresh();
      } else {
        const res = await createCustomerAction({
          fullName,
          fatherName,
          phone,
          whatsappNumber,
          email,
          address,
          emergencyContact,
          internalNotes,
          roles: selectedRoles,
          confirmDuplicate: overrideDuplicate,
          expectedDuplicateCustomerIds: expectedDuplicateIds,
        });

        if (!res.success) {
          setIsSubmitting(false);
          if (res.duplicateWarning?.hasDuplicates) {
            setDuplicateWarning(res.duplicateWarning);
            setShowDuplicateModal(true);
          } else {
            setError(res.error);
          }
          return;
        }

        router.push(`/admin/customers/${res.data.customerId}`);
        router.refresh();
      }
    } catch {
      setIsSubmitting(false);
      setError("An unexpected system error occurred. Please try again.");
    }
  };

  const handleConfirmDuplicate = () => {
    if (!duplicateWarning) return;
    setShowDuplicateModal(false);
    handleSubmit(undefined, true, duplicateWarning.duplicateCustomerIds);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-4 text-sm font-medium text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-6">
          <h2 className="text-lg font-semibold text-[#F5F0E8] border-b border-[#2A2A2A] pb-3">
            Core Customer Details
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mohammad Rahim"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Father's Name */}
            <div>
              <label htmlFor="fatherName" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
                Father&apos;s Name <span className="text-xs text-[#E8E0D4]/50">(Optional)</span>
              </label>
              <input
                type="text"
                id="fatherName"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Abdul Karim"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Primary Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
                Primary Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
              />
              <p className="text-xs text-[#E8E0D4]/50 mt-1">
                Will be normalized to +8801XXXXXXXXX format.
              </p>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label htmlFor="whatsappNumber" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
                WhatsApp Number <span className="text-xs text-[#E8E0D4]/50">(Optional)</span>
              </label>
              <input
                type="text"
                id="whatsappNumber"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 01812345678"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
                Email Address <span className="text-xs text-[#E8E0D4]/50">(Optional)</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
                Emergency Contact <span className="text-xs text-[#E8E0D4]/50">(Optional)</span>
              </label>
              <input
                type="text"
                id="emergencyContact"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Brother: 01512345678"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
              Address <span className="text-xs text-[#E8E0D4]/50">(Optional)</span>
            </label>
            <textarea
              id="address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Present and/or permanent address details..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none"
            />
          </div>

          {/* Customer Roles - Checkbox input onChange handles toggle cleanly */}
          <div>
            <label className="block text-sm font-medium text-[#E8E0D4] mb-2">
              Customer Roles <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_ROLES.map((r) => {
                const isChecked = selectedRoles.includes(r.value);
                const inputId = `role-${r.value}`;
                return (
                  <label
                    key={r.value}
                    htmlFor={inputId}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors select-none ${
                      isChecked
                        ? "border-[#C8B88A] bg-[#C8B88A]/10 text-[#F5F0E8]"
                        : "border-[#2A2A2A] bg-[#0A0A0A] text-[#E8E0D4]/70 hover:border-[#3A3A3A]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      name="roles"
                      value={r.value}
                      checked={isChecked}
                      onChange={() => toggleRole(r.value)}
                      className="h-4 w-4 rounded border-[#3A3A3A] bg-[#0A0A0A] text-[#C8B88A] focus:ring-[#C8B88A]"
                    />
                    <span className="text-sm font-medium">{r.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-[#E8E0D4] mb-1.5">
              Internal Admin Notes <span className="text-xs text-[#E8E0D4]/50">(Optional)</span>
            </label>
            <textarea
              id="internalNotes"
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal shop notes, preferences, or referral information..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 focus:border-[#C8B88A] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={isEdit && initialData ? `/admin/customers/${initialData.id}` : "/admin/customers"}
            className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-5 py-2.5 text-sm font-medium text-[#E8E0D4]/70 hover:text-[#F5F0E8] hover:bg-[#2A2A2A] transition-colors min-h-[44px] flex items-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#C8B88A] px-6 py-2.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#D8C89A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8B88A]/50 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Save Changes"
              : "Create Customer"}
          </button>
        </div>
      </form>

      {/* Duplicate Phone Confirmation Modal */}
      {showDuplicateModal && duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-amber-800/80 bg-[#1A1A1A] p-6 shadow-2xl space-y-4 text-[#F5F0E8]">
            <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-3 text-amber-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-lg font-bold">Duplicate Phone Number Detected</h3>
            </div>

            <p className="text-sm text-[#E8E0D4]/90 leading-relaxed">
              One or more existing customer records share this normalized phone number. Shared family phones are permitted, but require explicit admin confirmation.
            </p>

            <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-[#C8B88A] uppercase tracking-wider">
                Matching Existing Customer Records:
              </p>
              {duplicateWarning.matchingCustomers.map((mc) => (
                <div
                  key={mc.id}
                  className="flex items-center justify-between rounded bg-[#1A1A1A] p-2 text-xs border border-[#2A2A2A]"
                >
                  <div>
                    <span className="font-mono text-[#C8B88A] font-semibold mr-2">{mc.customerCode}</span>
                    <span className="font-medium text-[#F5F0E8]">{mc.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#E8E0D4]/70">{mc.maskedPhone}</span>
                    {mc.isArchived ? (
                      <span className="text-[10px] text-red-400 font-semibold">(Archived)</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-semibold">(Active)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-[#E8E0D4] hover:bg-[#2A2A2A] min-h-[44px]"
              >
                Cancel / Change Phone
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicate}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors min-h-[44px]"
              >
                {isEdit ? "Confirm & Save Changes" : "Confirm & Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
