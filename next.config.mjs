/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return {
      afterFiles: [
        {
          source: '/upload',
          destination: '/api/upload',
        },
        {
          source: '/hosturl',
          destination: '/api/hosturl',
        },
        {
          source: '/delete-images',
          destination: '/api/delete-images',
        },
        {
          source: '/admin/api/media',
          destination: '/api/admin/media',
        },
      ],
      beforeFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
