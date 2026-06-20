/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@bytecodealliance/preview2-shim',
      '@bytecodealliance/jco'
    ]
  }
};

module.exports = nextConfig;
