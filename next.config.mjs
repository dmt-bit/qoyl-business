/** @type {import('next').NextConfig} */
const nextConfig = {
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
