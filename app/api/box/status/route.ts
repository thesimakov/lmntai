import fs from "fs/promises";
import path from "path";

import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const REPO_DIR = path.join(process.cwd(), "lovable-cms");

async function getStatus() {
  let packageJson: { name?: string; description?: string } | null = null;
  try {
    const raw = await fs.readFile(path.join(REPO_DIR, "package.json"), "utf8");
    packageJson = JSON.parse(raw) as { name?: string; description?: string };
  } catch {
    packageJson = null;
  }
  return {
    cloned: packageJson != null,
    packageName: typeof packageJson?.name === "string" ? packageJson.name : null,
    packageDescription: typeof packageJson?.description === "string" ? packageJson.description : null
  };
}

async function handler() {
  const data = await getStatus();
  return Response.json(data);
}

export const GET = withApiLogging("/api/box/status", handler);
