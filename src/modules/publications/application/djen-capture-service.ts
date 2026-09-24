import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import {
  buildOabQueryVariants,
  normalizeDjenItem,
  publicationTargetsOab,
  normalizeLawyerName,
  type NormalizedDjenPublication,
} from "@/modules/integrations/djen/domain/djen-publication";
import { djenCandidateReason, isPotentialDjenCandidate } from "@/modules/integrations/djen/domain/djen-identity";
import { searchDjenAllPages } from "@/modules/integrations/djen/infrastructure/djen-client";

export type DjenCaptureResult = {
  oabsChecked: number;
  sourceItems: number;
  newPublications: number;
  updatedPublications: number;
  linkedToProcesses: number;
  existingProcessIds: string[];
  processLookupRemaining: number;
  unverifiedItems: number;
  reviewCandidates: number;
  reviewItems: number;
  ignoredItems: number;
  uniqueItems: number;
  skippedOabs: number;
  errors: Array<{ oab: string; error: string }>;
  window: { startDate: string; endDate: string };
};

export function saoPauloDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function previousIsoDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function defaultDjenCaptureWindow(now = new Date()) {
  const endDate = saoPauloDateString(now);
  return { startDate: previousIsoDate(endDate), endDate };
}

export function nextIsoDate(value: string) {
  const date = dateOnly(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function chooseDjenWindow(completedThrough: string | null, today: string) {
  const startDate = completedThrough ? previousIsoDate(completedThrough) : previousIsoDate(today);
  // Duas datas de avanço por rodada e um dia de sobreposição para não perder retificações.
  const boundedEnd = nextIsoDate(nextIsoDate(startDate));
  return { startDate, endDate: boundedEnd < today ? boundedEnd : today };
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

export async function persistPublication(input: {
  organizationId: string;
  actorUserId?: string | null;
  lawyerOabId: string;
  publication: NormalizedDjenPublication;
}) {
  // Prioriza ID da fonte e reconcilia registros legados cuja chave era baseada em hash.
  // Se duas linhas antigas possuírem identidades conflitantes, falha sem uni-las por CNJ.
  const matches = await prisma.publication.findMany({
    where: {
      organizationId: input.organizationId, source: "DJEN",
      OR: [
        { externalKey: input.publication.externalKey },
        ...(input.publication.externalId ? [{ externalId: input.publication.externalId }] : []),
        ...(input.publication.hash ? [{ AND: [
          { sourceHash: input.publication.hash },
          { OR: [{ externalId: null }, ...(input.publication.externalId ? [{ externalId: input.publication.externalId }] : [])] },
        ] }] : []),
      ],
    },
    select: { id: true, processId: true, sourceStatus: true, cancellationReason: true },
    take: 2,
  });
  if (matches.length > 1) throw new Error("DJEN_IDENTITY_CONFLICT");
  const existing = matches[0] ?? null;

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
            processMetadata: jsonValue(input.publication.processMetadata),
            summary: input.publication.summary,
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
            processMetadata: jsonValue(input.publication.processMetadata),
            summary: input.publication.summary,
            parties: jsonValue(input.publication.parties),
            explicitDates: jsonValue(input.publication.explicitDates),
            sourceUrl: input.publication.sourceUrl,
            sourceStatus: input.publication.sourceStatus,
            cancellationReason: input.publication.cancellationReason,
          },
        });

    const recipient = await tx.publicationRecipient.upsert({
      where: { publicationId_lawyerOabId: { publicationId: publication.id, lawyerOabId: input.lawyerOabId } },
      create: { organizationId: input.organizationId, publicationId: publication.id, lawyerOabId: input.lawyerOabId },
      update: {},
    });
    if (input.publication.sourceStatus === "ACTIVE") {
      await tx.publicationEmailDelivery.upsert({
        where: { publicationId_lawyerOabId: { publicationId: publication.id, lawyerOabId: input.lawyerOabId } },
        create: {
          organizationId: input.organizationId, publicationId: publication.id,
          lawyerOabId: recipient.lawyerOabId,
        },
        update: {},
      });
    }

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
          description: `${input.publication.communicationType} · DJeN · ${input.publication.summary}`,
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
            cnj: input.publication.processNumberFormatted ?? input.publication.processNumberRaw,
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

    return { isNew: !existing, newlyLinked, processId };
  });
}

async function saveReviewCandidate(input: {
  organizationId: string; lawyerOabId: string; publication: NormalizedDjenPublication;
  raw: unknown; searchMethod: "OAB" | "NAME"; reason: string;
}) {
  // Nunca gerar fila duplicada quando outra variante já confirmou esta comunicação.
  const verified = await prisma.publicationRecipient.findFirst({
    where: {
      organizationId: input.organizationId, lawyerOabId: input.lawyerOabId,
      publication: {
        organizationId: input.organizationId, source: "DJEN",
        OR: [
          { externalKey: input.publication.externalKey },
          ...(input.publication.externalId ? [{ externalId: input.publication.externalId }] : []),
          ...(input.publication.hash ? [{ AND: [
          { sourceHash: input.publication.hash },
          { OR: [{ externalId: null }, ...(input.publication.externalId ? [{ externalId: input.publication.externalId }] : [])] },
        ] }] : []),
        ],
      },
    },
    select: { id: true },
  });
  if (verified) return "verified" as const;
  const where = {
    organizationId_lawyerOabId_source_externalKey: {
      organizationId: input.organizationId, lawyerOabId: input.lawyerOabId,
      source: "DJEN", externalKey: input.publication.externalKey,
    },
  };
  const found = await prisma.djenReviewCandidate.findUnique({ where, select: { id: true, status: true } });
  const candidate = await prisma.djenReviewCandidate.upsert({
    where,
    create: {
      organizationId: input.organizationId, lawyerOabId: input.lawyerOabId,
      externalKey: input.publication.externalKey, searchMethod: input.searchMethod,
      reason: input.reason, payload: jsonValue(input.raw),
    },
    update: {
      // Decisões anteriores (APPROVED/DISMISSED/VERIFIED) não são reabertas por repetição.
      lastSeenAt: new Date(), payload: jsonValue(input.raw),
    },
  });
  if (!found) {
    await prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        category: "publications", action: "publication.review_candidate_received",
        entityType: "djen_review_candidate", entityId: candidate.id,
        metadata: {
          kind: input.publication.kind,
          cnj: input.publication.processNumberFormatted ?? input.publication.processNumberRaw,
        },
      },
    });
  }
  if (found?.status !== undefined && found.status !== "PENDING") return "closed" as const;
  return found ? "existing" as const : "created" as const;
}

/** Só uma captura por OAB, com cursor persistente e backfill idempotente. */
export async function syncOrganizationDjen(input: {
  organizationId: string;
  actorUserId?: string | null;
  startDate?: string;
  endDate?: string;
}): Promise<DjenCaptureResult> {
  if (Boolean(input.startDate) !== Boolean(input.endDate)) throw new Error("DJEN_WINDOW_INCOMPLETE");
  const plan = await resolvePlan(input.organizationId);
  if (!hasCapability(plan, "djen.monitoring")) throw new Error("DJEN_NOT_AVAILABLE_FOR_PLAN");
  const today = saoPauloDateString();
  const requested = input.startDate && input.endDate ? { startDate: input.startDate, endDate: input.endDate } : null;
  if (requested && (!/^\d{4}-\d{2}-\d{2}$/.test(requested.startDate)
    || requested.startDate > requested.endDate || requested.endDate > today)) throw new Error("DJEN_WINDOW_INVALID");
  const oabs = await prisma.lawyerOab.findMany({
    where: { organizationId: input.organizationId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    take: plan.oabs,
    include: { user: { select: { name: true } } },
  });
  const result: DjenCaptureResult = {
    oabsChecked: 0, sourceItems: 0, newPublications: 0, updatedPublications: 0,
    linkedToProcesses: 0, existingProcessIds: [], processLookupRemaining: 0, unverifiedItems: 0, reviewCandidates: 0, reviewItems: 0,
    ignoredItems: 0, uniqueItems: 0, skippedOabs: 0,
    errors: [], window: requested ?? defaultDjenCaptureWindow(),
  };

  for (const oab of oabs) {
    const token = randomUUID();
    // Upsert sem sobrescrever o cursor quando dois workers iniciam juntos.
    const cursor = await prisma.djenCaptureCursor.upsert({
      where: { lawyerOabId: oab.id },
      create: { organizationId: input.organizationId, lawyerOabId: oab.id },
      update: {},
    });
    const now = new Date();
    const locked = await prisma.djenCaptureCursor.updateMany({
      where: {
        id: cursor.id, organizationId: input.organizationId,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        leaseToken: token, leaseUntil: new Date(now.getTime() + 60 * 60_000),
        lastAttemptAt: now, status: "RUNNING", lastError: null,
      },
    });
    if (!locked.count) { result.skippedOabs += 1; continue; }
    result.oabsChecked += 1;
    const completedThrough = cursor.completedThrough?.toISOString().slice(0, 10) ?? null;
    const window = requested ?? chooseDjenWindow(completedThrough, today);
    result.window = window;

    try {
      if (normalizeLawyerName(oab.user.name) === "" || normalizeLawyerName(oab.user.name) === "NAO INFORMADO") {
        throw new Error("DJEN_REGISTERED_NAME_MISSING");
      }
      const variants = buildOabQueryVariants(oab.rawNumber, oab.normalizedNumber);
      // Cada dia só é considerado completo após ambas as pesquisas, todas as variantes e as gravações.
      for (let day = window.startDate; day <= window.endDate; day = nextIsoDate(day)) {
        const verified = new Map<string, NormalizedDjenPublication>();
        const seen = new Set<string>();
        const pending = new Map<string, { publication: NormalizedDjenPublication; raw: unknown;
          method: "OAB" | "NAME"; reason: string }>();
        const queries = [
          ...variants.map((oabVariant) => ({ mode: "OAB" as const, oab: oabVariant, uf: oab.state,
            startDate: day, endDate: day })),
          { mode: "NAME" as const, name: oab.user.name, startDate: day, endDate: day },
        ];
        for (const query of queries) {
          const rawItems = await searchDjenAllPages(query);
          result.sourceItems += rawItems.length;
          for (const [itemIndex, raw] of rawItems.entries()) {
            let publication: NormalizedDjenPublication;
            try { publication = normalizeDjenItem(raw); }
            catch (cause) {
              // Nunca ocultar a causa real ou registrar texto, nome, processo e OAB
              // recebidos do CNJ. Metadados abaixo identificam a falha sem PII.
              const code = cause instanceof Error && /^DJEN_[A-Z0-9_]+$/.test(cause.message)
                ? cause.message : "DJEN_NORMALIZATION_UNEXPECTED";
              const fields = raw && typeof raw === "object" && !Array.isArray(raw)
                ? Object.keys(raw).filter((key) => /data|date/i.test(key)).slice(0, 12)
                : [];
              console.error("[djen.capture.normalization]", {
                code, method: query.mode, day, position: itemIndex + 1, dateFields: fields,
              });
              // A data nao e presumida nem o cursor avanca: a janela sera repescada.
              throw new Error(`${code} [${query.mode} ${day} item ${itemIndex + 1}]`);
            }
            seen.add(publication.externalKey);
            let matched = publicationTargetsOab(publication, oab.normalizedNumber, oab.state, oab.user.name);
            if (!matched) {
              // Comunicações que já foram confirmadas para esta inscrição permanecem verificadas
              // após retificação/cancelamento, inclusive quando a origem só oferece hash.
              // O vínculo pré-existente é exigido: nunca atribuir a nova OAB por inferência.
              const known = await prisma.publicationRecipient.findFirst({
                where: {
                  organizationId: input.organizationId, lawyerOabId: oab.id,
                  publication: { organizationId: input.organizationId, source: "DJEN",
                    OR: [
                      { externalKey: publication.externalKey },
                      ...(publication.externalId ? [{ externalId: publication.externalId }] : []),
                      ...(publication.hash ? [{ AND: [
                        { sourceHash: publication.hash },
                        { OR: [{ externalId: null }, ...(publication.externalId ? [{ externalId: publication.externalId }] : [])] },
                      ] }] : []),
                    ],
                  },
                },
                select: { id: true },
              });
              matched = Boolean(known);
            }
            if (matched) {
              verified.set(publication.externalKey, publication);
              pending.delete(publication.externalKey);
            } else if (!verified.has(publication.externalKey)) {
              if (!isPotentialDjenCandidate({ publication, oab: oab.normalizedNumber,
                state: oab.state, registeredName: oab.user.name, mode: query.mode })) continue;
              result.unverifiedItems += 1;
              pending.set(publication.externalKey, {
                publication, raw, method: query.mode,
                reason: djenCandidateReason(publication, oab.normalizedNumber, oab.state, oab.user.name),
              });
            }
          }
        }
        result.uniqueItems += seen.size;
        result.ignoredItems += Math.max(0, seen.size - verified.size - pending.size);
        for (const publication of verified.values()) {
          const saved = await persistPublication({
            organizationId: input.organizationId, actorUserId: input.actorUserId,
            lawyerOabId: oab.id, publication,
          });
          if (saved.isNew) result.newPublications += 1;
          else result.updatedPublications += 1;
          if (saved.newlyLinked) result.linkedToProcesses += 1;
          if (saved.processId && !result.existingProcessIds.includes(saved.processId)) {
            result.existingProcessIds.push(saved.processId);
          }
          await prisma.djenReviewCandidate.updateMany({
            where: { organizationId: input.organizationId, lawyerOabId: oab.id,
              externalKey: publication.externalKey, status: "PENDING" },
            data: { status: "VERIFIED", decidedAt: new Date() },
          });
        }
        for (const entry of pending.values()) {
          const saved = await saveReviewCandidate({ organizationId: input.organizationId, lawyerOabId: oab.id,
            publication: entry.publication, raw: entry.raw,
            searchMethod: entry.method, reason: entry.reason });
          if (saved === "created") result.reviewCandidates += 1;
          if (saved === "created" || saved === "existing") result.reviewItems += 1;
        }
        // Sucesso por DIA: se o worker falhar amanhã, repesca do último dia + sobreposição.
        await prisma.djenCaptureCursor.updateMany({
          where: { id: cursor.id, organizationId: input.organizationId, leaseToken: token },
          data: {
            ...(completedThrough && day <= completedThrough ? {} : { completedThrough: dateOnly(day) }),
            lastSuccessAt: new Date(),
            status: "RUNNING", lastError: null,
          },
        });
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "DJEN_UNKNOWN_ERROR";
      result.errors.push({ oab: `${oab.rawNumber}/${oab.state}`, error: code });
      await prisma.djenCaptureCursor.updateMany({
        where: { id: cursor.id, organizationId: input.organizationId, leaseToken: token },
        data: { status: "ERROR", lastError: code },
      });
    } finally {
      await prisma.djenCaptureCursor.updateMany({
        where: { id: cursor.id, organizationId: input.organizationId, leaseToken: token },
        data: { leaseToken: null, leaseUntil: null,
          ...(result.errors.some((item) => item.oab === `${oab.rawNumber}/${oab.state}`)
            ? {} : { status: "IDLE" }) },
      });
    }
  }
  // O complemento processual é feito em uma segunda fase pelo navegador e NÃO bloqueia DJeN.
  // Rotação de até 20 processos existentes por verificação, inclusive sem publicação nova.
  // A data da última tentativa muda mesmo com timeout, evitando ficar preso sempre no mesmo CNJ.
  const MAX_LOOKUPS = 20;
  // Rotação justa: uma OAB com 20 resultados repetidos não pode impedir a
  // atualização dos outros processos cadastrados na organização.
  const selected = await prisma.process.findMany({
    where: { organizationId: input.organizationId, status: { in: ["ACTIVE", "FOUND", "CLOSED"] } },
    orderBy: [{ lastMovementCheckAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    select: { id: true }, take: MAX_LOOKUPS,
  });
  result.existingProcessIds = selected.map((item) => item.id);
  result.processLookupRemaining = Math.max(0,
    await prisma.process.count({ where: { organizationId: input.organizationId,
      status: { in: ["ACTIVE", "FOUND", "CLOSED"] } } }) - result.existingProcessIds.length);
  if (result.oabsChecked > 0) {
    await prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        category: "publications",
        action: result.errors.length ? "publication.capture_partial" : "publication.capture_completed",
        entityType: "djen_capture",
        entityId: input.organizationId,
        metadata: {
          oabsChecked: result.oabsChecked, newPublications: result.newPublications,
          updatedPublications: result.updatedPublications,
          reviewCandidates: result.reviewCandidates, errors: result.errors.length,
        },
      },
    });
  }
  return result;
}
