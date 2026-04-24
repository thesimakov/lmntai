"use client";

import { useEffect, useState } from "react";

import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";

/**
 * Режим моста Lemnity AI с сервера (LEMNITY_AI_BRIDGE_ENABLED или устар. MANUS_FULL_PARITY_ENABLED).
 * Пока `ready === false`, не запускайте legacy-инициализацию и не отправляйте сообщения.
 */
export function useLemnityAiBridgeFromServer(): { ready: boolean; fullParity: boolean } {
  const [serverParity, setServerParity] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/bootstrap`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bootstrap"))))
      .then((d: { fullParity?: boolean }) => {
        if (!cancelled) setServerParity(Boolean(d.fullParity));
      })
      .catch(() => {
        if (!cancelled) setServerParity(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready: serverParity !== null,
    fullParity: serverParity === true
  };
}
