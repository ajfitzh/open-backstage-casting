/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Ensure images from external sources (like Baserow) work
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.baserow.io', // Or your self-hosted domain
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'open-backstage.org', // Add your self-hosted domain here!
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;