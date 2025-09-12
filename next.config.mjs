/** Plain Next.js config – Lint im Build aus */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // optional, falls TS-Warnungen dich auch stoppen sollten:
  // typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
