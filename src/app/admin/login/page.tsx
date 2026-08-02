import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In | Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLoginPage() {
  // If already authenticated, redirect to dashboard
  const session = await getCurrentAdminSession();
  if (session) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
            <svg className="h-7 w-7 text-[#C8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#F5F0E8] tracking-tight">
            Sristy-Dristy Bike House
          </h1>
          <p className="mt-1 text-sm text-[#E8E0D4]/60">
            Administration Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-medium text-[#F5F0E8] mb-6">
            Sign in to your account
          </h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#E8E0D4]/30">
          © {new Date().getFullYear()} Sristy-Dristy Enterprise
        </p>
      </div>
    </div>
  );
}
