import { NextResponse } from "next/server";

import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";

/** Режим моста Lemnity AI (без авторизации; для клиентского bootstrap). */
export async function GET() {
  return NextResponse.json({ fullParity: isLemnityAiBridgeEnabledServer() });
}
