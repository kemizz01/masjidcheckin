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
};

export default nextConfig;