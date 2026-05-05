import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/** Клиент с CMS-слоем имеет делегат `cmsSite` (getter на прототипе). Старый синглтон / кэш HMR могут дать клиент без него → `cmsSite.findUnique` падает. */
export function prismaHasCmsDelegate(client: unknown): boolean {
  if (!client || typeof client !== "object") return false;
  try {
    const del = Reflect.get(client as object, "cmsSite") as { findUnique?: unknown } | undefined;
    return typeof del?.findUnique === "function";
  } catch {
    return false;
  }
}

/** Dev: перед `findUnique`/после `prisma generate` глобальный singleton может быть устаревшим — сброс и пересоздание экземпляра. */
function disconnectAndClearGlobalStale(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const cached = global.prisma;
  if (!cached || prismaHasCmsDelegate(cached)) return false;
  void cached.$disconnect().catch(() => {});
  global.prisma = undefined;
  return true;
}

function instantiateClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

disconnectAndClearGlobalStale();

let prismaInstance: PrismaClient | undefined =
  global.prisma && prismaHasCmsDelegate(global.prisma) ? global.prisma : undefined;

if (!prismaInstance) {
  prismaInstance = instantiateClient();
}

let recreateAttempts = 0;
while (!prismaHasCmsDelegate(prismaInstance) && recreateAttempts < 2) {
  recreateAttempts += 1;
  void prismaInstance.$disconnect().catch(() => {});
  prismaInstance = instantiateClient();
}

const cmsMisgenMsg =
  "Prisma Client без моделей CMS (cmsSite недоступен). В каталоге lmntai выполните «npx prisma generate» и полностью перезапустите dev-сервер (остановите next dev и запустите снова).";

if (!prismaHasCmsDelegate(prismaInstance)) {
  throw new Error(cmsMisgenMsg);
}

if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaInstance;
}

export const prisma = prismaInstance;
