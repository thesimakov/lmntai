/**
 * Ждёт готовности Postgres в контейнере docker compose (fallback, если нет `docker compose up --wait`).
 */
import { execSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const tries = 40;
for (let i = 0; i < tries; i++) {
  try {
    execSync("docker compose exec -T db pg_isready -U lemnity -d lemnity", {
      stdio: "ignore"
    });
    console.log("[db] PostgreSQL готов.");
    process.exit(0);
  } catch {
    process.stdout.write(`[db] ожидание… ${i + 1}/${tries}\r`);
  }
  await delay(1000);
}
console.error("\n[db] Таймаут. Запущен ли Docker и сервис db? (docker compose ps)");
process.exit(1);
