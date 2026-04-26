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
 *
 * Ниже подмешиваются корневые `.env*` и при наличии `/etc/lemnity/production.env` (как в deploy:production)
 * — иначе `next start` под PM2 не видел бы `ADMIN_*` / `DATABASE_URL`, заданные только вне репо.
 */
const fs = require("fs");
const path = require("path");

/** Простой парсер строк KEY=VAL (как в dotenv), без зависимостей. */
function parseEnvFile(absPath) {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(absPath, "utf8");
  } catch {
    return out;
  }
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    trimmed = trimmed.replace(/^export\s+/i, "");
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let val = trimmed.slice(eq + 1).trim();
    const dbl = val.startsWith('"') && val.endsWith('"') && val.length >= 2;
    const sgl = val.startsWith("'") && val.endsWith("'") && val.length >= 2;
    if (dbl || sgl) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Как у Next для production: последующие файлы перекрывают предыдущие. */
function loadRootEnv(dir) {
  const names = [".env", ".env.production", ".env.local", ".env.production.local"];
  const merged = {};
  for (const name of names) {
    Object.assign(merged, parseEnvFile(path.join(dir, name)));
  }
  return merged;
}

const ETC_PRODUCTION_ENV = "/etc/lemnity/production.env";
/** Локальные .env* в репо, затем (если есть) secrets на сервере — как у deploy:production. */
const fileEnv = { ...loadRootEnv(__dirname), ...parseEnvFile(ETC_PRODUCTION_ENV) };

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
        ...fileEnv,
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
        ...fileEnv,
        NODE_ENV: "production",
        LEMNITY_BUILDER_PORT: "8787"
      }
    }
  ]
};
