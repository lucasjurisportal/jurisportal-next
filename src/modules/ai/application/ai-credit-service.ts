import { prisma } from "@/infrastructure/database/prisma";
import { AI_ACTION_CAPABILITY, aiPeriodKey, assertAiReservationAllowed, assertCreditQuantity,
  calculateAiCreditBalance, type AiCreditBalance, type AiCreditRecord } from "../domain/ai-credit-policy";
import type { AiAction } from "../domain/ai-policy";
import { planHasCapability } from "@/modules/plans/application/plan-entitlements";
import type { PlanSlug } from "@/modules/plans/domain/plan.types";
import type { Prisma } from "@/generated/prisma/client";

/** Fundação financeira; não envia conteúdo nem chama fornecedor de IA. */
function assertActionAllowed(planSlug: PlanSlug, action: AiAction) {
  if (!planHasCapability(planSlug, AI_ACTION_CAPABILITY[action])) throw new Error("AI_ACTION_NOT_INCLUDED");
}

function calculate(planSlug: PlanSlug, now: Date, records: readonly AiCreditRecord[]): AiCreditBalance {
  return calculateAiCreditBalance({ planSlug, periodKey: aiPeriodKey(now), now, records });
}

const usageSelect = { status: true, reservedCredits: true, chargedCredits: true, expiresAt: true } as const;

export async function getAiCreditBalance(organizationId: string, planSlug: PlanSlug, now = new Date()) {
  const records = await prisma.aiCreditUsage.findMany({
    where: { organizationId, periodKey: aiPeriodKey(now) }, select: usageSelect,
  });
  return calculate(planSlug, now, records);
}

/**
 * Use somente em serviço autenticado que obtém organizationId/plano da sessão.
 * requestKey é idempotência server-side por tentativa; maxCredits é estimativa/teto do backend.
 * A trava na organização SERIALIZA reservas de todos os usuários e servidores do escritório.
 */
export async function reserveAiCredits(input: {
  organizationId: string; actorUserId: string; planSlug: PlanSlug;
  action: AiAction; requestKey: string; maxCredits: number; now?: Date;
}) {
  assertActionAllowed(input.planSlug, input.action);
  assertCreditQuantity(input.maxCredits);
  if (!/^[A-Za-z0-9:_-]{12,120}$/.test(input.requestKey)) throw new Error("AI_REQUEST_KEY_INVALID");
  const now = input.now ?? new Date();
  const periodKey = aiPeriodKey(now);
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const org = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "organization" WHERE "id" = ${input.organizationId}::uuid FOR NO KEY UPDATE
    `;
    if (!org.length) throw new Error("AI_ORGANIZATION_NOT_FOUND");
    const existing = await tx.aiCreditUsage.findUnique({
      where: { organizationId_requestKey: { organizationId: input.organizationId, requestKey: input.requestKey } },
    });
    if (existing) {
      if (existing.actorUserId !== input.actorUserId || existing.action !== input.action ||
          existing.reservedCredits !== input.maxCredits || existing.periodKey !== periodKey) {
        throw new Error("AI_REQUEST_KEY_CONFLICT");
      }
      if (existing.status !== "SETTLED" &&
          (existing.status !== "RESERVED" || existing.expiresAt.getTime() <= now.getTime())) {
        throw new Error("AI_REQUEST_ALREADY_CLOSED");
      }
      return existing; // Nunca debitar ou reservar duas vezes; consumidor deve conferir status.
    }
    await tx.aiCreditUsage.updateMany({
      where: { organizationId: input.organizationId, status: "RESERVED", expiresAt: { lte: now } },
      data: { status: "EXPIRED", completedAt: now },
    });
    const records = await tx.aiCreditUsage.findMany({
      where: { organizationId: input.organizationId, periodKey }, select: usageSelect,
    });
    assertAiReservationAllowed(calculate(input.planSlug, now, records), input.maxCredits);
    return tx.aiCreditUsage.create({ data: {
      organizationId: input.organizationId, actorUserId: input.actorUserId,
      periodKey, requestKey: input.requestKey, action: input.action,
      reservedCredits: input.maxCredits, expiresAt: new Date(now.getTime() + 5 * 60_000),
    } });
  }, { maxWait: 15_000, timeout: 30_000 });
}

/** Confirma o custo REAL após resultado válido. Sem confirmação, a reserva não é gasto. */
export async function settleAiCredits(input: {
  organizationId: string; requestKey: string; chargedCredits: number; now?: Date;
}) {
  assertCreditQuantity(input.chargedCredits);
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const org = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "organization" WHERE "id" = ${input.organizationId}::uuid FOR NO KEY UPDATE
    `;
    if (!org.length) throw new Error("AI_ORGANIZATION_NOT_FOUND");
    const usage = await tx.aiCreditUsage.findUnique({
      where: { organizationId_requestKey: { organizationId: input.organizationId, requestKey: input.requestKey } },
    });
    if (!usage) throw new Error("AI_RESERVATION_NOT_FOUND");
    if (usage.status === "SETTLED" && usage.chargedCredits === input.chargedCredits) return usage;
    if (usage.status !== "RESERVED") throw new Error("AI_RESERVATION_CLOSED");
    if (usage.expiresAt.getTime() <= now.getTime()) {
      throw new Error("AI_RESERVATION_EXPIRED"); // limpeza feita na próxima reserva; saldo já ignora vencidas
    }
    if (input.chargedCredits > usage.reservedCredits) throw new Error("AI_COST_EXCEEDS_RESERVATION");
    return tx.aiCreditUsage.update({ where: { id: usage.id }, data: {
      status: "SETTLED", chargedCredits: input.chargedCredits, completedAt: now,
    } });
  }, { maxWait: 15_000, timeout: 30_000 });
}

/** Falha do provedor: encerra reserva sem débito; não reembolsa cobrança já concluída. */
export async function releaseAiCredits(input: {
  organizationId: string; requestKey: string; reason: string;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const org = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "organization" WHERE "id" = ${input.organizationId}::uuid FOR NO KEY UPDATE
    `;
    if (!org.length) throw new Error("AI_ORGANIZATION_NOT_FOUND");
    const usage = await tx.aiCreditUsage.findUnique({ where: {
      organizationId_requestKey: { organizationId: input.organizationId, requestKey: input.requestKey },
    } });
    if (!usage) throw new Error("AI_RESERVATION_NOT_FOUND");
    if (usage.status === "RELEASED") return usage;
    if (usage.status !== "RESERVED") throw new Error("AI_RESERVATION_CLOSED");
    return tx.aiCreditUsage.update({ where: { id: usage.id }, data: {
      status: "RELEASED", resolutionNote: input.reason.slice(0, 500), completedAt: new Date(),
    } });
  }, { maxWait: 15_000, timeout: 30_000 });
}

/** Correção auditável de cobrança liquidada; sem excluir o registro contábil. */
export async function refundAiCredits(input: {
  organizationId: string; requestKey: string; reason: string;
}) {
  if (!input.reason.trim()) throw new Error("AI_REFUND_REASON_REQUIRED");
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const org = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "organization" WHERE "id" = ${input.organizationId}::uuid FOR NO KEY UPDATE
    `;
    if (!org.length) throw new Error("AI_ORGANIZATION_NOT_FOUND");
    const usage = await tx.aiCreditUsage.findUnique({ where: {
      organizationId_requestKey: { organizationId: input.organizationId, requestKey: input.requestKey },
    } });
    if (!usage) throw new Error("AI_RESERVATION_NOT_FOUND");
    if (usage.status === "REFUNDED") return usage;
    if (usage.status !== "SETTLED") throw new Error("AI_REFUND_NOT_ALLOWED");
    return tx.aiCreditUsage.update({ where: { id: usage.id }, data: {
      status: "REFUNDED", resolutionNote: input.reason.trim().slice(0, 500), refundedAt: new Date(),
    } });
  }, { maxWait: 15_000, timeout: 30_000 });
}
