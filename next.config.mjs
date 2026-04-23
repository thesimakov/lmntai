import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Когда в родительской папке есть ещё один package-lock, Next 15 путает корень — явно указываем репо.
  outputFileTracingRoot: __dirname,
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
  },
  // Раньше / рендерился через page с redirect() — в prod давало Invariant: clientReferenceManifest
  // (RSC + route group). Редирект на уровне конфига обходит баг.
  async redirects() {
    return [{ source: "/", destination: "/playground", permanent: false }];
  }
};

export default nextConfig;
