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
  // Нативные модули ssh2/dockerode: externalize только для server-бандла Webpack'ом.
  // `serverComponentsExternalPackages` на 14.2.3x в ряде деплоев давал runtime:
  // TypeError: … 'clientModules' (clientReferenceManifest undefined).
  webpack: (config, { isServer }) => {
    if (isServer) {
      const ext = config.externals ?? [];
      const extra = {
        ssh2: "commonjs ssh2",
        dockerode: "commonjs dockerode",
        "docker-modem": "commonjs docker-modem"
      };
      config.externals = Array.isArray(ext) ? [...ext, extra] : [ext, extra];
    }
    return config;
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
