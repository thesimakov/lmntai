import { prisma } from "@/lib/prisma";

export type UserSavedBlockMeta = {
  id: string;
  name: string;
  blockType: "grapesjs" | "zero";
  scope: "personal" | "team";
  createdAt: string;
};

export type UserSavedBlockFull = UserSavedBlockMeta & {
  htmlContent: string;
  cssContent: string;
};

export type CreateUserBlockInput = {
  userId: string;
  name: string;
  blockType: "grapesjs" | "zero";
  htmlContent: string;
  cssContent: string;
  teamProjectId?: string | null;
};

const PERSONAL_LIMIT = 200;
const TEAM_LIMIT = 500;

function toMeta(row: {
  id: string;
  name: string;
  blockType: string;
  teamProjectId: string | null;
  createdAt: Date;
}): UserSavedBlockMeta {
  return {
    id: row.id,
    name: row.name,
    blockType: row.blockType as "grapesjs" | "zero",
    scope: row.teamProjectId ? "team" : "personal",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUserBlocks(
  userId: string,
  projectId?: string,
): Promise<UserSavedBlockMeta[]> {
  const where = projectId
    ? { OR: [{ userId, teamProjectId: null }, { teamProjectId: projectId }] }
    : { userId, teamProjectId: null };

  const rows = await prisma.userSavedBlock.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, blockType: true, teamProjectId: true, createdAt: true },
  });

  return rows.map(toMeta);
}

export async function createUserBlock(
  input: CreateUserBlockInput,
): Promise<UserSavedBlockMeta> {
  const { userId, name, blockType, htmlContent, cssContent, teamProjectId } = input;

  const countWhere = teamProjectId
    ? { teamProjectId }
    : { userId, teamProjectId: null };
  const limit = teamProjectId ? TEAM_LIMIT : PERSONAL_LIMIT;

  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.userSavedBlock.count({ where: countWhere });
    if (count >= limit) {
      throw new Error(`Block library limit reached (${limit})`);
    }

    return tx.userSavedBlock.create({
      data: { userId, name, blockType, htmlContent, cssContent, teamProjectId: teamProjectId ?? null },
      select: { id: true, name: true, blockType: true, teamProjectId: true, createdAt: true },
    });
  });

  return toMeta(created);
}

export async function getUserBlockById(
  id: string,
  userId: string,
  projectId?: string,
): Promise<UserSavedBlockFull | null> {
  const where = projectId
    ? { id, OR: [{ userId }, { teamProjectId: projectId }] }
    : { id, userId };

  const row = await prisma.userSavedBlock.findFirst({ where });
  if (!row) return null;
  return {
    ...toMeta(row),
    htmlContent: row.htmlContent,
    cssContent: row.cssContent,
  };
}

export async function renameUserBlock(
  id: string,
  userId: string,
  name: string,
): Promise<boolean> {
  const row = await prisma.userSavedBlock.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.userSavedBlock.update({ where: { id }, data: { name } });
  return true;
}

export async function deleteUserBlock(id: string, userId: string): Promise<boolean> {
  const row = await prisma.userSavedBlock.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.userSavedBlock.delete({ where: { id } });
  return true;
}
