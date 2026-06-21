/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@bytecodealliance/preview2-shim',
      '@bytecodealliance/jco'
    ]
  },
  devIndicators: false,
};

module.exports = nextConfig;
