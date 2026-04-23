/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Включение на проде (Next 14.2.x) у части деплоев давало в рантайме
    // TypeError: Cannot read properties of undefined (reading 'clientModules').
    // register() в instrumentation.ts не критичен для рендера; при необходимости вернуть
    // после обновления Next / после проверки на staging.
    // instrumentationHook: true,
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      }
    ]
  }
};

export default nextConfig;
