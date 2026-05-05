import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Когда в родительской папке есть ещё один package-lock, Next 15 путает корень — явно указываем репо.
  outputFileTracingRoot: __dirname,
  /** esbuild — только для серверного бандла превью Lovable; не тянуть .d.ts в client graph. */
  /** Prisma обязан браться из `node_modules` после `generate`; иначе бандлер иногда подмешивает устаревший DMMF (нет `preferredEditor`). */
  serverExternalPackages: ["esbuild", "nodemailer", "@prisma/client"],
  experimental: {
    /** У части сборок Next 15 dev падает с 500: SegmentViewNode / React Client Manifest. */
    devtoolSegmentExplorer: false,
    // Включение на проде (Next 14.2.x) у части деплоев давало в рантайме
    // TypeError: Cannot read properties of undefined (reading 'clientModules').
    // register() в instrumentation.ts не критичен для рендера; при необходимости вернуть
    // после обновления Next / после проверки на staging.
    // instrumentationHook: true,
    serverActions: {
      // Визред / большие PATCH в API — не упираться в дефолт 2 МБ там, где включены Server Actions.
      bodySizeLimit: "64mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**"
      }
    ]
  },
  async redirects() {
    return [
      { source: "/playground/grapes", destination: "/playground/box/editor", permanent: true }
    ];
  },
  async rewrites() {
    return [{ source: "/api/manus/:path*", destination: "/api/lemnity-ai/:path*" }];
  }
};

export default nextConfig;
