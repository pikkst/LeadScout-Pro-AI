// Playbook marketplace service: private team packs and curated vertical packs.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";

export type PackPayload = {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: "PRIVATE" | "CURATED";
  vertical?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: Array<{ id: string; playbookId: string; sortOrder: number; playbook?: { id: string; name: string; type: string; status: string } }>;
  createdBy?: { id: string; name: string; email: string };
};

export async function createPack(input: {
  name: string;
  slug: string;
  description?: string;
  visibility?: "PRIVATE" | "CURATED";
  vertical?: string;
  playbookIds?: string[];
}, createdById: string): Promise<PackPayload> {
  const existing = await prisma.playbookPack.findUnique({ where: { slug: input.slug } });
  if (existing) throw new HttpError(409, "Pack slug already exists", "CONFLICT");

  const pack = await prisma.playbookPack.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description ?? "",
      visibility: input.visibility ?? "PRIVATE",
      vertical: input.vertical,
      createdById,
      items: input.playbookIds?.length
        ? {
            create: input.playbookIds.map((playbookId, index) => ({
              playbookId,
              sortOrder: index,
            })),
          }
        : undefined,
    },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { playbook: { select: { id: true, name: true, type: true, status: true } } } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return serializePack(pack);
}

export async function listPacks(filters?: { visibility?: string; vertical?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.visibility) where.visibility = filters.visibility;
  if (filters?.vertical) where.vertical = filters.vertical;

  const packs = await prisma.playbookPack.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { playbook: { select: { id: true, name: true, type: true, status: true } } } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return packs.map(serializePack);
}

export async function getPack(slug: string): Promise<PackPayload> {
  const pack = await prisma.playbookPack.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { playbook: { select: { id: true, name: true, type: true, status: true } } } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!pack) throw new HttpError(404, "Pack not found", "NOT_FOUND");
  return serializePack(pack);
}

export async function updatePack(slug: string, input: {
  name?: string;
  description?: string;
  visibility?: "PRIVATE" | "CURATED";
  vertical?: string;
}) {
  const pack = await prisma.playbookPack.findUnique({ where: { slug } });
  if (!pack) throw new HttpError(404, "Pack not found", "NOT_FOUND");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "visibility", "vertical"] as const) {
    if (input[key] !== undefined) data[key] = input[key];
  }

  const updated = await prisma.playbookPack.update({
    where: { slug },
    data,
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { playbook: { select: { id: true, name: true, type: true, status: true } } } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return serializePack(updated);
}

export async function addPackItem(packSlug: string, playbookId: string, sortOrder?: number) {
  const pack = await prisma.playbookPack.findUnique({ where: { slug: packSlug } });
  if (!pack) throw new HttpError(404, "Pack not found", "NOT_FOUND");

  const playbook = await prisma.playbook.findUnique({ where: { id: playbookId } });
  if (!playbook) throw new HttpError(404, "Playbook not found", "NOT_FOUND");

  const existing = await prisma.packItem.findFirst({ where: { packId: pack.id, playbookId } });
  if (existing) throw new HttpError(409, "Playbook already in pack", "CONFLICT");

  const maxSort = await prisma.packItem.findFirst({
    where: { packId: pack.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const item = await prisma.packItem.create({
    data: {
      packId: pack.id,
      playbookId,
      sortOrder: sortOrder ?? (maxSort?.sortOrder ?? 0) + 1,
    },
  });

  return item;
}

export async function removePackItem(packSlug: string, playbookId: string) {
  const pack = await prisma.playbookPack.findUnique({ where: { slug: packSlug } });
  if (!pack) throw new HttpError(404, "Pack not found", "NOT_FOUND");

  const item = await prisma.packItem.findFirst({ where: { packId: pack.id, playbookId } });
  if (!item) throw new HttpError(404, "Item not found in pack", "NOT_FOUND");

  await prisma.packItem.delete({ where: { id: item.id } });
  return { ok: true };
}

export async function deletePack(slug: string) {
  const pack = await prisma.playbookPack.findUnique({ where: { slug } });
  if (!pack) throw new HttpError(404, "Pack not found", "NOT_FOUND");

  await prisma.packItem.deleteMany({ where: { packId: pack.id } });
  await prisma.playbookPack.delete({ where: { slug } });
  return { ok: true };
}

export async function applyPackToWorkspace(slug: string, targetPlaybookIds?: string[]) {
  const pack = await prisma.playbookPack.findUnique({
    where: { slug },
    include: { items: { select: { playbookId: true } } },
  });
  if (!pack) throw new HttpError(404, "Pack not found", "NOT_FOUND");

  const ids = targetPlaybookIds ?? pack.items.map((i) => i.playbookId);
  return {
    applied: ids.length,
    playbookIds: ids,
    packName: pack.name,
  };
}

function serializePack(pack: {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: "PRIVATE" | "CURATED";
  vertical: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    playbookId: string;
    sortOrder: number;
    playbook?: { id: string; name: string; type: string; status: string };
  }>;
  createdBy?: { id: string; name: string; email: string };
}): PackPayload {
  return {
    id: pack.id,
    name: pack.name,
    slug: pack.slug,
    description: pack.description,
    visibility: pack.visibility,
    vertical: pack.vertical ?? undefined,
    isActive: pack.isActive,
    createdAt: pack.createdAt.toISOString(),
    updatedAt: pack.updatedAt.toISOString(),
    items: pack.items?.map((i) => ({
      id: i.id,
      playbookId: i.playbookId,
      sortOrder: i.sortOrder,
      playbook: i.playbook,
    })),
    createdBy: pack.createdBy,
  };
}
