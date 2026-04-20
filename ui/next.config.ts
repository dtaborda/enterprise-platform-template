import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@enterprise/ui", "@enterprise/core", "@enterprise/contracts", "@enterprise/db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Local Supabase dev
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
