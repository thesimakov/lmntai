/**
 * In-memory бинарные ассеты превью песочницы: картинки, подтянутые на сервере
 * и отдаваемые с same-origin, чтобы в iframe не зависеть от внешних сетей.
 */

export type StoredImageAsset = {
  mime: string;
  data: Buffer;
};

declare global {
  // eslint-disable-next-line no-var
  var lemnitySandboxImageAssets: Map<string, Map<string, StoredImageAsset>> | undefined;
}

const bySandbox =
  global.lemnitySandboxImageAssets ?? new Map<string, Map<string, StoredImageAsset>>();
if (!global.lemnitySandboxImageAssets) {
  global.lemnitySandboxImageAssets = bySandbox;
}

export function setSandboxImageAsset(
  sandboxId: string,
  key: string,
  asset: StoredImageAsset
): void {
  let m = bySandbox.get(sandboxId);
  if (!m) {
    m = new Map();
    bySandbox.set(sandboxId, m);
  }
  m.set(key, asset);
}

export function getSandboxImageAsset(
  sandboxId: string,
  key: string
): StoredImageAsset | undefined {
  return bySandbox.get(sandboxId)?.get(key);
}

export function clearSandboxImageAssets(sandboxId: string): void {
  bySandbox.delete(sandboxId);
}

/** Удалить только ключи‑слоты `0`,`1`,`2`,… перед новой порцией материализованных URL. Ключи вида `img_*.webp` сохраняем. */
export function clearSandboxMaterializedImageSlots(sandboxId: string): void {
  const m = bySandbox.get(sandboxId);
  if (!m) return;
  for (const k of [...m.keys()]) {
    if (/^\d+$/.test(k)) {
      m.delete(k);
    }
  }
}
