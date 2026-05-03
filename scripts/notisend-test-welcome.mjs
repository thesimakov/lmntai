#!/usr/bin/env node
/**
 * Проверка отправки приветствия через NotiSend с тем же телом, что и после регистрации.
 * Запуск из корня репозитория:
 *   node scripts/notisend-test-welcome.mjs ваш@email.ru
 *
 * Читает NOTISEND_API_KEY, NOTISEND_WELCOME_TEMPLATE_ID, NEXT_PUBLIC_SITE_URL из .env.local и .env
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnv(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) {
    return;
  }
  const text = fs.readFileSync(p, "utf8");
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\n/g, "\n");
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadDotEnv(".env.local");
loadDotEnv(".env");

const key = process.env.NOTISEND_API_KEY?.trim();
const tid = (process.env.NOTISEND_WELCOME_TEMPLATE_ID || "1841098").trim();
const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://lemnity.com").replace(/\/$/, "");
const to = process.argv[2]?.trim();

if (!key) {
  console.error("Нет NOTISEND_API_KEY в .env / .env.local");
  process.exit(1);
}
if (!to) {
  console.error("Использование: node scripts/notisend-test-welcome.mjs ваш@email.ru");
  process.exit(1);
}

const url = `https://api.notisend.ru/v1/email/templates/${encodeURIComponent(tid)}/messages`;
const body = {
  to: to.toLowerCase(),
  params: {
    name: "Тест NotiSend",
    email: to.toLowerCase(),
    site_url: site
  }
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text.length > 2000 ? `${text.slice(0, 2000)}…` : text);

let bad = !res.ok;
try {
  const j = JSON.parse(text);
  if (j && typeof j === "object" && Array.isArray(j.errors) && j.errors.length) {
    bad = true;
  }
  if (j && typeof j === "object" && j.error != null) {
    bad = true;
  }
} catch {
  /* не JSON — ориентируемся на HTTP */
}

process.exit(bad ? 1 : 0);
