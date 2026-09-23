/**
 * Next.js configuration for MasjidCheckIn.
 *
 * Vercel serverless functions have a 50 MB unzipped limit.  The AI libraries
 * below are large native / WASM packages — marking them as `serverExternalPackages`
 * prevents Next.js from bundling them through webpack, keeping each function's
 * bundle size under the limit.
 *
 * `serverExternalPackages` applies to both Route Handlers and Server Components
 * in the App Router (Next.js 14.1+).
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Prevent bundling of heavy AI libraries (loaded at runtime from node_modules).
  serverExternalPackages: [
    "@tensorflow/tfjs",
    "@tensorflow-models/mobilenet",
    // NOTE: @vladmandic/face-api is NOT external — Next.js MUST bundle and
    // CJS-transform the ESM build (face-api.esm.js) because Node.js would
    // otherwise treat its .js file as CJS and choke on `export` syntax.
    "jpeg-js",
  ],

  // Keep the workspace root unambiguous (silences the lockfile warning).
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
