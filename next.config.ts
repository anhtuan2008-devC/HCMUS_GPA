import type { NextConfig } from "next";

function buildContentSecurityPolicy() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const connectSources = ["'self'"];

  if (supabaseUrl) {
    connectSources.push(supabaseUrl, supabaseUrl.replace("https://", "wss://"));
  }

  const scriptSources = ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

function buildSecurityHeaders() {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
