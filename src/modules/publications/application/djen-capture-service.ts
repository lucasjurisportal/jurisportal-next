import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import {
  buildOabQueryVariants,
  normalizeDjenItem,
  publicationTargetsOab,
  type NormalizedDjenPublication,
} from "@/modules/integrations/djen/domain/djen-publication";
import { searchDjenAllPages } from "@/modules/integrations/djen/infrastructure/djen-client";

export type DjenCaptureResult = {
  oabsChecked: number;
  sourceItems: number;
  newPublications: number;
  updatedPublications: number;
  linkedToProcesses: number;
  errors: Array<{ oab: string; error: string }>;
  window: { startDate: string; endDate: string };
};

function saoPauloDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function previousIsoDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function defaultDjenCaptureWindow(now = new Date()) {
  const endDate = saoPauloDateString(now);
  return { startDate: previousIsoDate(endDate), endDate };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function resolvePlan(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { organizationId }, select: { planSlug: true } });
  const plan = planCatalog.find((item) => item.slug === (subscription?.planSlug ?? "free")) ?? planCatalog[0];
  return plan;
}

async function persistPublication(input: {
  organizationId: string;
  actorUserId?: string | null;
  lawyerOabId: string;
  publication: NormalizedDjenPublication;
}) {
  const existing = await prisma.publication.findUnique({
    where: {
      organizationId_source_externalKey: {
        organizationId: input.organizationId,
        source: "DJEN",
        externalKey: input.publication.externalKey,
      },
    },
    select: { id: true, processId: true, sourceStatus: true, cancellationReason: true },
  });

  const process = input.publication.processNumberNormalized?.length === 20
    ? await prisma.process.findFirst({
        where: { organizationId: input.organizationId, cnjNormalized: input.publication.processNumberNormalized },
        select: { id: true },
      })
    : null;

  const processId = existing?.processId ?? process?.id ?? null;
  const suggestedDate = input.publication.explicitDates.length === 1 ? input.publication.explicitDates[0] : null;
  const deadlineTitle = input.publication.kind === "INTIMATION" ? "Revisar prazo da intimação" : "Revisar prazo da publicação";

  return prisma.$transaction(async (tx) => {
    const publication = existing
      ? await tx.publication.update({
          where: { id: existing.id },
          data: {
            processId,
            externalId: input.publication.externalId,
            sourceHash: input.publication.hash,
            kind: input.publication.kind,
            communicationType: input.publication.communicationType,
            documentType: input.publication.documentType,
            court: input.publication.court,
            judicialBody: input.publication.judicialBody,
            processNumberRaw: input.publication.processNumberRaw,
            processNumberNormalized: input.publication.processNumberNormalized,
            processNumberFormatted: input.publication.processNumberFormatted,
            publicationDate: dateOnly(input.publication.publicationDate),
            content: input.publication.content,
            parties: jsonValue(input.publication.parties),
            explicitDates: jsonValue(input.publication.explicitDates),
            sourceUrl: input.publication.sourceUrl,
            sourceStatus: input.publication.sourceStatus,
            cancellationReason: input.publication.cancellationReason,
            lastSeenAt: new Date(),
          },
        })
      : await tx.publication.create({
          data: {
            organizationId: input.organizationId,
            processId,
            source: "DJEN",
            externalKey: input.publication.externalKey,
            externalId: input.publication.externalId,
            sourceHash: input.publication.hash,
            kind: input.publication.kind,
            communicationType: input.publication.communicationType,
            documentType: input.publication.documentType,
            court: input.publication.court,
            judicialBody: input.publication.judicialBody,
            processNumberRaw: input.publication.processNumberRaw,
            processNumberNormalized: input.publication.processNumberNormalized,
            processNumberFormatted: input.publication.processNumberFormatted,
            publicationDate: dateOnly(input.publication.publicationDate),
            content: input.publication.content,
            parties: jsonValue(input.publication.parties),
            explicitDates: jsonValue(input.publication.explicitDates),
            sourceUrl: input.publication.sourceUrl,
            sourceStatus: input.publication.sourceStatus,
            cancellationReason: input.publication.cancellationReason,
          },
        });

    await tx.publicationRecipient.upsert({
      where: { publicationId_lawyerOabId: { publicationId: publication.id, lawyerOabId: input.lawyerOabId } },
      create: { organizationId: input.organizationId, publicationId: publication.id, lawyerOabId: input.lawyerOabId },
      update: {},
    });

    const sourceCancelled = input.publication.sourceStatus === "CANCELLED";
    await tx.deadlineReview.upsert({
      where: { publicationId: publication.id },
      create: {
        organizationId: input.organizationId,
        publicationId: publication.id,
        status: sourceCancelled ? "SOURCE_CANCELLED" : "PENDING_REVIEW",
        origin: input.publication.kind,
        title: deadlineTitle,
        suggestedDate: !sourceCancelled && suggestedDate ? dateOnly(suggestedDate) : null,
        sourceTextReference: `publication:${publication.id}`,
      },
      update: {},
    });

    if (sourceCancelled) {
      // Se a origem cancelar antes da revisão humana, retiramos apenas a pendência de revisão.
      // Um prazo que o advogado já confirmou nunca é apagado ou alterado silenciosamente.
      await tx.deadlineReview.updateMany({
        where: { publicationId: publication.id, status: "PENDING_REVIEW" },
        data: { status: "SOURCE_CANCELLED", suggestedDate: null },
      });
    } else {
      // Se uma comunicação voltar a ficar ativa, uma revisão que estava bloqueada pela origem volta a ser pendente.
      await tx.deadlineReview.updateMany({
        where: { publicationId: publication.id, status: "SOURCE_CANCELLED" },
        data: { status: "PENDING_REVIEW", suggestedDate: suggestedDate ? dateOnly(suggestedDate) : null },
      });
      if (suggestedDate) {
        await tx.deadlineReview.updateMany({
          where: { publicationId: publication.id, status: "PENDING_REVIEW", suggestedDate: null },
          data: { suggestedDate: dateOnly(suggestedDate) },
        });
      }
    }

    const newlyLinked = Boolean(processId && (!existing || !existing.processId));
    if ((!existing || newlyLinked) && processId) {
      await tx.processTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          processId,
          kind: input.publication.kind === "INTIMATION" ? "INTIMATION_RECEIVED" : "PUBLICATION_RECEIVED",
          title: input.publication.kind === "INTIMATION" ? "Intimação recebida" : "Publicação recebida",
          description: `${input.publication.communicationType} · DJeN`,
          source: "DJEN",
          createdByUserId: input.actorUserId ?? null,
        },
      });
    }

    if (!existing) {
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId ?? null,
          category: "publications",
          action: "publication.captured",
          entityType: "publication",
          entityId: publication.id,
          metadata: {
            source: "DJEN",
            kind: input.publication.kind,
            processId,
            lawyerOabId: input.lawyerOabId,
            publicationDate: input.publication.publicationDate,
          },
        },
      });
    } else if (
      existing.sourceStatus !== input.publication.sourceStatus ||
      existing.cancellationReason !== input.publication.cancellationReason
    ) {
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId ?? null,
          category: "publications",
          action: "publication.source_status_updated",
          entityType: "publication",
          entityId: publication.id,
          metadata: { sourceStatus: input.publication.sourceStatus, cancellationReason: input.publication.cancellationReason },
        },
      });
    }

    return { isNew: !existing, newlyLinked };
  });
}

/**
 * Captura DJeN de todas as OABs ativas do escritório.
 * A função não envia e-mail nem WhatsApp: captura e notificação permanecem separadas.
 */
export async function syncOrganizationDjen(input: {
  organizationId: string;
  actorUserId?: string | null;
  startDate?: string;
  endDate?: string;
}): Promise<DjenCaptureResult> {
  const plan = await resolvePlan(input.organizationId);
  if (!hasCapability(plan, "djen.monitoring")) throw new Error("DJEN_NOT_AVAILABLE_FOR_PLAN");

  const window = input.startDate && input.endDate
    ? { startDate: input.startDate, endDate: input.endDate }
    : defaultDjenCaptureWindow();

  const oabs = await prisma.lawyerOab.findMany({
    where: { organizationId: input.organizationId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    take: plan.oabs,
  });

  const result: DjenCaptureResult = {
    oabsChecked: 0,
    sourceItems: 0,
    newPublications: 0,
    updatedPublications: 0,
    linkedToProcesses: 0,
    errors: [],
    window,
  };

  for (const oab of oabs) {
    result.oabsChecked += 1;
    try {
      const variants = buildOabQueryVariants(oab.rawNumber, oab.normalizedNumber);
      const normalizedByKey = new Map<string, NormalizedDjenPublication>();

      for (const variant of variants) {
        const rawItems = await searchDjenAllPages({
          oab: variant,
          uf: oab.state,
          startDate: window.startDate,
          endDate: window.endDate,
        });
        result.sourceItems += rawItems.length;

        for (const raw of rawItems) {
          try {
            const publication = normalizeDjenItem(raw);
            if (publication.lawyers.length > 0 && !publicationTargetsOab(publication, oab.normalizedNumber, oab.state)) continue;
            normalizedByKey.set(publication.externalKey, publication);
          } catch (error) {
            console.warn("[djen.normalize]", error);
          }
        }
      }

      for (const publication of normalizedByKey.values()) {
        const saved = await persistPublication({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          lawyerOabId: oab.id,
          publication,
        });
        if (saved.isNew) result.newPublications += 1;
        else result.updatedPublications += 1;
        if (saved.newlyLinked) result.linkedToProcesses += 1;
      }
    } catch (error) {
      result.errors.push({
        oab: `${oab.rawNumber}/${oab.state}`,
        error: error instanceof Error ? error.message : "DJEN_UNKNOWN_ERROR",
      });
    }
  }

  return result;
}
