import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Em desenvolvimento, o Next bloqueia os scripts da página quando ela é aberta por um endereço
  // diferente de "localhost" (127.0.0.1, IP da rede, etc.). Sem os scripts a página aparece, mas
  // nada responde ao clique. Esta lista libera esses endereços.
  allowedDevOrigins: ['127.0.0.1', '0.0.0.0', '192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
};

export default nextConfig;
