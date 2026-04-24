/**
 * PM2: зафиксировать NODE_ENV=production для `next start` (иначе предупреждения Next
 * и риск несоответствия с тем, чего ожидает `next build`).
 * Запуск: из корня репо — `pm2 start ecosystem.config.cjs` или
 * `pm2 delete lemnity && pm2 start ecosystem.config.cjs`
 *
 * Второй процесс `lemnity-builder` — встроенный upstream для моста `/api/lemnity-ai/*`.
 * Первый запуск: после `npm run builder:build` и при необходимости
 * `set -a && . /etc/lemnity/production.env && set +a && pm2 start ecosystem.config.cjs --only lemnity-builder`
 * (переменные AI_GATEWAY_* и DATABASE_URL должны быть в окружении).
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "lemnity",
      cwd: __dirname,
      // Прямой entrypoint Next — иначе PM2 иногда запускает shell-шим из .bin и падает с выводом «npm start».
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "lemnity-builder",
      cwd: path.join(__dirname, "services", "lemnity-builder"),
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env: {
        NODE_ENV: "production",
        LEMNITY_BUILDER_PORT: "8787"
      }
    }
  ]
};
