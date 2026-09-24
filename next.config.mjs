/**
 * Next.js configuration for MasjidCheckIn.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  serverExternalPackages: [
    "@tensorflow/tfjs",
    "@tensorflow-models/mobilenet",
    "jpeg-js",
  ],

  outputFileTracingRoot: process.cwd(),

  // Include face-api model files in serverless function bundles so they
  // can be read from the filesystem at runtime (bypasses Vercel
  // Deployment Protection which blocks HTTP self-fetches).
  outputFileTracingIncludes: {
    "/api/recognize-face": ["./public/models/**/*"],
    "/api/register-face": ["./public/models/**/*"],
    "/api/register-scene": ["./public/models/**/*"],
    "/api/verify-scene": ["./public/models/**/*"],
    "/api/diagnostics": ["./public/models/**/*"],
  },
};

export default nextConfig;