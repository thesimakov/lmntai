"use client";

import { useEffect } from "react";
import { attachChunkLoadRecoveryHandlers } from "@/lib/chunk-load-recovery";

/**
 * После гидрации — дублирует ранний inline-скрипт из root layout.
 * В dev дополнительно делает HEAD по URL chunk'а (гонка пересборки).
 */
export function ChunkLoadRecovery() {
  useEffect(() => attachChunkLoadRecoveryHandlers(), []);
  return null;
}
