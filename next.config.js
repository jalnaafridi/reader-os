/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: { serverActions: { allowedOrigins: ["*"] } },
};

module.exports = nextConfig;
