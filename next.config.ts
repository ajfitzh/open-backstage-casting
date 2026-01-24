/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Images config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.baserow.io',
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
        hostname: 'open-backstage.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;