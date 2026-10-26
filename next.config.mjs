/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows next/image to load from the shared Supabase project's public
  // storage bucket (not used by the static marketing pages' <video> tags --
  // those load directly, unaffected by this -- but needed for any app page
  // that uses next/image against this bucket).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cqpxiassldkmusngqorx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // The three B2B marketing pages are static HTML in public/marketing/
  // (served verbatim so their design isn't re-implemented in React).
  // beforeFiles so "/" resolves here instead of an app/page.tsx.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/marketing/brands.html" },
        { source: "/stylists", destination: "/marketing/stylists.html" },
        { source: "/hair-sellers", destination: "/marketing/hair-sellers.html" },
      ],
    };
  },
};

export default nextConfig;
