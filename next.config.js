/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
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
      // 🟢 ADDED DIGITALOCEAN SPACES
      {
        protocol: 'https',
        hostname: 'cyt-fredericksburg.nyc3.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;