import withPWA from "@ducanh2912/next-pwa";

const nextConfig = {
  // deine bestehenden Next-Optionen bleiben hier (wenn du welche hast)
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
