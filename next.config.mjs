import withPWA from "next-pwa";
const nextConfig = {}; // ggf. deine bisherigen Optionen hier lassen
export default withPWA({ dest: "public", disable: process.env.NODE_ENV === "development" })(nextConfig);
