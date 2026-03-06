import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server components use Node.js APIs — allow them for the server-side Express bridge
  serverExternalPackages: ['express', 'cors', 'uuid'],
};

export default nextConfig;
