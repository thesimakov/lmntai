/**
 * PM2: зафиксировать NODE_ENV=production для `next start` (иначе предупреждения Next
 * и риск несоответствия с тем, чего ожидает `next build`).
 * Запуск: из корня репо — `pm2 start ecosystem.config.cjs` или
 * `pm2 delete lemnity && pm2 start ecosystem.config.cjs`
 */
module.exports = {
  apps: [
    {
      name: "lemnity",
      cwd: __dirname,
      script: "node_modules/.bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
