/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the build step to redirect output to a release-specific directory
  // by setting NEXT_DIST_DIR to an absolute path before running `next build`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
}

export default nextConfig
