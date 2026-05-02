import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function isPgMissingStarterPaidUntilColumn(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2010") return false;
  const meta = error.meta as { message?: string; code?: string } | undefined;
  const msg = typeof meta?.message === "string" ? meta.message : error.message;
  return (
    meta?.code === "42703" &&
    msg.includes("starterPaidUntil") &&
    msg.includes("does not exist")
  );
}

/** Обходит проверку полей клиента Prisma; при неприменённой миграции без колонки возвращает `null`. */
export async function fetchUserStarterPaidUntilById(userId: string): Promise<Date | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ starterPaidUntil: Date | null }>>`
      SELECT "starterPaidUntil" FROM "User" WHERE "id" = ${userId} LIMIT 1
    `;
    return rows[0]?.starterPaidUntil ?? null;
  } catch (err) {
    if (isPgMissingStarterPaidUntilColumn(err)) {
      console.warn(
        "[user-starter-paid-until-raw] column starterPaidUntil missing; run prisma migrate deploy"
      );
      return null;
    }
    throw err;
  }
}

export async function setUserStarterPaidUntilById(userId: string, value: Date): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "User" SET "starterPaidUntil" = ${value} WHERE "id" = ${userId}
    `;
  } catch (err) {
    if (isPgMissingStarterPaidUntilColumn(err)) {
      throw new Error(
        'Столбец "starterPaidUntil" отсутствует в БД. Примените миграции: `npx prisma migrate deploy`.'
      );
    }
    throw err;
  }
}
