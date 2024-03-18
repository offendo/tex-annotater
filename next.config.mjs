/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:5000/:path*"
            : process.env.NODE_ENV === "production"
              ? "http://127.0.0.1:5000/:path*"
              : "/api/:path",
      },
      {
        source: '/:path*',
        destination: '/',
      },
    ];
  },
  experimental: {
    appDir: true,
  },
  future: { webpack5: true },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
