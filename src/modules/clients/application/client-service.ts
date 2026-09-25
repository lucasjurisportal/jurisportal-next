import { Prisma } from "@/generated/prisma/client";
import { scopedRecordWhere } from "@/modules/security/domain/tenant-process-scope";
import { prisma } from "@/infrastructure/database/prisma";
import type { PlanLimit } from "@/modules/plans/domain/plan.types";
import { assertClientCapacity } from "../domain/client-policy";
import type { ClientInput } from "../domain/client.schema";
import { digitsOnly } from "../domain/tax-id";

const PAGE_SIZE = 10;

function normalizePhone(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return digitsOnly(value).slice(0, 15);
}

function birthDateFromInput(value?: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function toPersistence(input: ClientInput) {
  return {
    kind: input.kind,
    name: input.name.trim(),
    tradeName: input.kind === "PJ" && input.tradeName?.trim() ? input.tradeName.trim() : null,
    taxIdRaw: input.taxId.trim(),
    taxIdNormalized: digitsOnly(input.taxId),
    birthDate: input.kind === "PF" ? birthDateFromInput(input.birthDate) : null,
    primaryContactName: input.kind === "PJ" ? input.primaryContactName?.trim() || null : null,
    email: input.email.trim().toLowerCase(),
    whatsapp: normalizePhone(input.whatsapp)!,
    phone: normalizePhone(input.phone),
    postalCode: digitsOnly(input.postalCode).slice(0, 8),
    street: input.street.trim(),
    number: input.number.trim(),
    complement: input.complement?.trim() || null,
    district: input.district.trim(),
    city: input.city.trim(),
    state: input.state,
    notes: input.notes?.trim() || null,
  };
}

export async function listClients(input: {
  organizationId: string;
  page?: number;
  query?: string;
  kind?: "PF" | "PJ";
  status?: "ACTIVE" | "ARCHIVED";
  state?: string;
}) {
  const page = Math.max(1, input.page ?? 1);
  const query = input.query?.trim();
  const where: Prisma.ClientWhereInput = {
    organizationId: input.organizationId,
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.state ? { state: input.state } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { tradeName: { contains: query, mode: "insensitive" } },
            { taxIdNormalized: { contains: digitsOnly(query) || query } },
            { email: { contains: query, mode: "insensitive" } },
            { whatsapp: { contains: digitsOnly(query) || query } },
            { phone: { contains: digitsOnly(query) || query } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { processLinks: true } },
        processLinks: {
          where: { process: { status: "ACTIVE" } },
          select: { id: true },
        },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getClient(organizationId: string, clientId: string) {
  return prisma.client.findFirst({ where: { id: clientId, organizationId } });
}

export async function createClient(input: {
  organizationId: string;
  actorUserId: string;
  clientLimit: PlanLimit;
  data: ClientInput;
  source?: "MANUAL" | "IMPORT";
}) {
  const normalizedTaxId = digitsOnly(input.data.taxId);

  const [count, duplicate] = await Promise.all([
    prisma.client.count({ where: { organizationId: input.organizationId } }),
    prisma.client.findUnique({
      where: {
        organizationId_taxIdNormalized: {
          organizationId: input.organizationId,
          taxIdNormalized: normalizedTaxId,
        },
      },
    }),
  ]);

  assertClientCapacity(count, input.clientLimit);
  if (duplicate) throw new Error("CLIENT_DUPLICATE_TAX_ID");

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        organizationId: input.organizationId,
        ...toPersistence(input.data),
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "clients",
        action: "client.created",
        entityType: "client",
        entityId: client.id,
        metadata: { kind: client.kind, taxIdLast4: client.taxIdNormalized.slice(-4), source: input.source ?? "MANUAL" },
      },
    });

    return client;
  });
}

export async function updateClient(input: {
  organizationId: string;
  actorUserId: string;
  clientId: string;
  data: ClientInput;
}) {
  const current = await getClient(input.organizationId, input.clientId);
  if (!current) throw new Error("CLIENT_NOT_FOUND");

  const normalizedTaxId = digitsOnly(input.data.taxId);
  const duplicate = await prisma.client.findFirst({
    where: {
      organizationId: input.organizationId,
      taxIdNormalized: normalizedTaxId,
      NOT: { id: input.clientId },
    },
  });
  if (duplicate) throw new Error("CLIENT_DUPLICATE_TAX_ID");

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: scopedRecordWhere(input.clientId, input.organizationId),
      data: {
        ...toPersistence(input.data),
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "clients",
        action: "client.updated",
        entityType: "client",
        entityId: client.id,
      },
    });

    return client;
  });
}

export async function setClientArchived(input: {
  organizationId: string;
  actorUserId: string;
  clientId: string;
  archived: boolean;
}) {
  const current = await getClient(input.organizationId, input.clientId);
  if (!current) throw new Error("CLIENT_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: scopedRecordWhere(input.clientId, input.organizationId),
      data: {
        status: input.archived ? "ARCHIVED" : "ACTIVE",
        archivedAt: input.archived ? new Date() : null,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "clients",
        action: input.archived ? "client.archived" : "client.restored",
        entityType: "client",
        entityId: client.id,
      },
    });

    return client;
  });
}

export async function deleteClientPermanently(input: {
  organizationId: string;
  actorUserId: string;
  actorRole: string;
  clientId: string;
}) {
  if (input.actorRole !== "owner") throw new Error("CLIENT_DELETE_FORBIDDEN");

  const current = await getClient(input.organizationId, input.clientId);
  if (!current) throw new Error("CLIENT_NOT_FOUND");

  const linkedProcesses = await prisma.processClient.count({
    where: { organizationId: input.organizationId, clientId: input.clientId },
  });
  if (linkedProcesses > 0) throw new Error("CLIENT_HAS_PROCESS_LINKS");

  return prisma.$transaction(async (tx) => {
    // O evento de auditoria fica preservado mesmo depois que o cadastro for removido.
    // Mantemos apenas metadados mínimos para não reter os dados pessoais apagados.
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "clients",
        action: "client.deleted_permanently",
        entityType: "client",
        entityId: current.id,
        metadata: {
          kind: current.kind,
          taxIdLast4: current.taxIdNormalized.slice(-4),
        },
      },
    });

    await tx.client.delete({
      where: scopedRecordWhere(current.id, input.organizationId),
    });

    return { id: current.id };
  });
}
