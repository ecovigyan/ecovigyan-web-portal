/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable source maps in production to avoid warnings
  productionBrowserSourceMaps: false,
  // Add empty turbopack config to silence the warning
  turbopack: {},
  async rewrites() {
    return {
      // The mobile apps call https://api.ecovigyan.org/v1/..., which used to be
      // a separate Express server. Those paths are now served by /api/v1.
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'api.ecovigyan.org' }],
          destination: '/api/v1',
        },
        { source: '/v1', destination: '/api/v1' },
        { source: '/v1/:path*', destination: '/api/v1/:path*' },
      ],
    };
  },
};

export default nextConfig;
