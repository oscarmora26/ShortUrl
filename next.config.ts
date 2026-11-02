import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // S10: the build must never reach the database, so no route may be
  // prerendered at build time. Route handlers opt out individually with
  // `export const dynamic = "force-dynamic"`.
  poweredByHeader: false,
  // Docker/Railway: emit a self-contained server bundle.
  output: "standalone",
};

export default nextConfig;
