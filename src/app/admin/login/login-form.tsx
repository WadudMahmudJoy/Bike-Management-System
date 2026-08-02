"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import type { LoginResult } from "@/lib/auth/types";

const initialState: LoginResult = { success: false };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {/* Error message */}
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-[#D44638]/30 bg-[#D44638]/10 px-4 py-3 text-sm text-[#D44638]"
        >
          {state.error}
        </div>
      )}

      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[#E8E0D4]/80 mb-1.5"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 shadow-sm transition-colors focus:border-[#C8B88A]/50 focus:outline-none focus:ring-1 focus:ring-[#C8B88A]/30 disabled:opacity-50"
          placeholder="admin@example.com"
        />
      </div>

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[#E8E0D4]/80 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="block w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#E8E0D4]/30 shadow-sm transition-colors focus:border-[#C8B88A]/50 focus:outline-none focus:ring-1 focus:ring-[#C8B88A]/30 disabled:opacity-50"
          placeholder="Enter your password"
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-lg bg-[#C8B88A] px-4 py-3 text-sm font-semibold text-[#0A0A0A] shadow-sm transition-all hover:bg-[#B8A87A] focus:outline-none focus:ring-2 focus:ring-[#C8B88A]/50 focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {isPending ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
