/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/teile", destination: "/terminplaner", permanent: true },
    ];
  },
};

module.exports = nextConfig;
