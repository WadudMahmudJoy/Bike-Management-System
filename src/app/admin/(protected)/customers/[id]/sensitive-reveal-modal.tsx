"use client";

import { useState, useEffect, useCallback } from "react";
import type { SensitiveRevealResult } from "@/lib/sensitive-data/types";

interface SensitiveRevealModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onRevealSubmit: (password: string) => Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }>;
}

export function SensitiveRevealModal({
  title,
  isOpen,
  onClose,
  onRevealSubmit,
}: SensitiveRevealModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plaintextResult, setPlaintextResult] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  // Clear state when modal closes or unmounts
  const handleClose = useCallback(() => {
    setPassword("");
    setError(null);
    setPlaintextResult(null);
    setSecondsRemaining(30);
    onClose();
  }, [onClose]);

  // 30-second visibility auto-clear timer & tab visibility listener
  useEffect(() => {
    if (!plaintextResult) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPlaintextResult(null);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setPlaintextResult(null);
        handleClose();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [plaintextResult, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your current admin password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const currentPassword = password;
    setPassword(""); // Clear password immediately

    const res = await onRevealSubmit(currentPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
    } else {
      setPlaintextResult(res.data.plaintext);
      setSecondsRemaining(30);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            type="button"
          >
            ✕
          </button>
        </div>

        {plaintextResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-amber-400 font-medium mb-1">
                Decrypted Plaintext (Auto-hides in {secondsRemaining}s)
              </p>
              <p className="font-mono text-2xl font-bold tracking-widest text-zinc-100 select-all">
                {plaintextResult}
              </p>
            </div>
            <p className="text-xs text-zinc-400 text-center">
              This reveal action has been logged for security auditing.
            </p>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-zinc-800 py-2.5 font-medium text-zinc-200 hover:bg-zinc-700"
              type="button"
            >
              Hide Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
              <span className="font-medium text-amber-400">Security Warning:</span> Admin password re-authentication is required to decrypt this sensitive record. All reveal requests are logged.
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="revealPasswordInput" className="block text-sm font-medium text-zinc-300 mb-1">
                Admin Password
              </label>
              <input
                id="revealPasswordInput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
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
                {isSubmitting ? "Verifying..." : "Authenticate & Reveal"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
