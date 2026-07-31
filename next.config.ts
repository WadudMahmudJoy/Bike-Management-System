import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
      },
      ...(isProd
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000",
            },
          ]
        : []),
    ];

    const privateRobotsHeader = {
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    };

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin",
        headers: [privateRobotsHeader],
      },
      {
        source: "/admin/:path*",
        headers: [privateRobotsHeader],
      },
      {
        source: "/api/:path*",
        headers: [privateRobotsHeader],
      },
    ];
  },
};

export default nextConfig;
