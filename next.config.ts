import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    redirects() {
      return [
        {
          source: '/',
          destination: '/signup',
          permanent: true,
        },
      ]
    },

};

export default nextConfig;
