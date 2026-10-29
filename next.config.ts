import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1', '0.0.0.0', '192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
};

export default nextConfig;
