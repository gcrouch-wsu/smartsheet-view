import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow iframe embedding of public view pages from any origin (WordPress, etc.)
        source: "/view/:path*",
        headers: [
          // CSP frame-ancestors is the correct mechanism for cross-origin iframe embedding.
          // X-Frame-Options is intentionally omitted: it has no standard "allow all" value,
          // and modern browsers respect frame-ancestors over X-Frame-Options when both are set.
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
