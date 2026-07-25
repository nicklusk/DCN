/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kxaxqroicomowqjckxsm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
    redirects() {
    return [
      {
        source: '/',
        destination: '/signup',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig