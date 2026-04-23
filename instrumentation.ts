import { getPostgresDatabaseUrlErrorMessage } from "@/lib/database-url";

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const err = getPostgresDatabaseUrlErrorMessage();
  if (err) {
    console.warn(`[lemnity] ${err}`);
  }
}
