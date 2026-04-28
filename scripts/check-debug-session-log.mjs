#!/usr/bin/env node
/**
 * Проверяет NDJSON-файл лога отладочной сессии Cursor: `.cursor/debug-<SESSION>.log`.
 *
 * Примеры:
 *   npm run debug:verify-session-log
 *   DEBUG_SESSION_ID=e26be1 npm run debug:verify-session-log
 *   REQUIRE_APPLY=1 npm run debug:verify-session-log   # ждёт хотя бы одну запись apply_visual_edit_ok
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionId = process.env.DEBUG_SESSION_ID || "e26be1";
const logPath = path.join(__dirname, "..", ".cursor", `debug-${sessionId}.log`);

if (!fs.existsSync(logPath)) {
  console.error(`Log file missing: ${logPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(logPath, "utf8").trim();
if (!raw) {
  console.error("Log file is empty");
  process.exit(1);
}

const lines = raw.split("\n").filter(Boolean);
let parsed = 0;
let invalid = 0;
const messages = [];

for (const line of lines) {
  try {
    const j = JSON.parse(line);
    parsed++;
    if (typeof j.message === "string") messages.push(j.message);
  } catch {
    invalid++;
  }
}

console.log(`debug session ${sessionId}: ${lines.length} line(s), ${parsed} JSON ok, ${invalid} invalid`);

if (invalid > 0) {
  console.error("Non-JSON lines present");
  process.exit(1);
}

if (process.env.REQUIRE_APPLY === "1") {
  const hasApply = messages.some((m) => m === "apply_visual_edit_ok");
  if (!hasApply) {
    console.error(
      "Expected message apply_visual_edit_ok — reproduce: visual editor → Apply to preview, then re-run this script"
    );
    process.exit(1);
  }
}

process.exit(0);
