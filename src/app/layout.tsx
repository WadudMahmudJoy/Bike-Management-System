import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig, getValidatedSiteUrl } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = siteConfig.indexingEnabled
  ? getValidatedSiteUrl()
  : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: {
    default: `${siteConfig.businessName} | Pre-Owned Motorcycles`,
    template: `%s | ${siteConfig.businessName}`,
  },
  description: siteConfig.defaultDescription,
  applicationName: siteConfig.businessName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteConfig.businessName} | Pre-Owned Motorcycles`,
    description: siteConfig.defaultDescription,
    siteName: siteConfig.businessName,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${siteConfig.businessName} | Pre-Owned Motorcycles`,
    description: siteConfig.defaultDescription,
  },
  robots: {
    index: siteConfig.indexingEnabled,
    follow: siteConfig.indexingEnabled,
    googleBot: {
      index: siteConfig.indexingEnabled,
      follow: siteConfig.indexingEnabled,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
