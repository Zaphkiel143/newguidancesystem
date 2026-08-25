import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Documents are stored as bytes directly in Postgres (base64 over the
      // wire inflates ~33%), so the default 1mb limit is far too small.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
