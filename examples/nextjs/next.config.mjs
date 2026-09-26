/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Disable image optimisation since it is not available with static export.
  images: { unoptimized: true },
}

export default nextConfig
