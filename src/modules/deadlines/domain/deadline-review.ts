export type DeadlineReviewStatus = "pending_review" | "confirmed" | "dismissed";

export type DeadlineOrigin = "manual" | "publication" | "intimation";

export type DeadlineReview = {
  status: DeadlineReviewStatus;
  origin: DeadlineOrigin;
  title: string;
  sourceTextReference?: string;
  suggestedDate?: string;
  confirmedDate?: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
  dismissedByUserId?: string;
  dismissedAt?: string;
};

function assertIsoDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data deve usar o formato AAAA-MM-DD.");
  }
}

/**
 * Uma publicação pode gerar uma revisão de prazo sem possuir uma data.
 * Isso evita inventar vencimentos e força conferência humana.
 */
export function createPendingDeadlineReview(input: {
  origin: DeadlineOrigin;
  title: string;
  suggestedDate?: string;
  sourceTextReference?: string;
}): DeadlineReview {
  if (!input.title.trim()) throw new Error("Título da revisão de prazo é obrigatório.");
  if (input.suggestedDate) assertIsoDate(input.suggestedDate);

  return {
    status: "pending_review",
    origin: input.origin,
    title: input.title.trim(),
    suggestedDate: input.suggestedDate,
    sourceTextReference: input.sourceTextReference,
  };
}

/**
 * Somente uma ação humana explícita transforma a revisão em prazo confirmado no v1.
 */
export function confirmDeadlineReview(
  review: DeadlineReview,
  input: { date: string; userId: string; confirmedAt: string },
): DeadlineReview {
  if (review.status !== "pending_review") {
    throw new Error("Somente prazo pendente de revisão pode ser confirmado.");
  }
  if (!input.userId.trim()) throw new Error("Usuário confirmador é obrigatório.");
  assertIsoDate(input.date);

  return {
    ...review,
    status: "confirmed",
    confirmedDate: input.date,
    confirmedByUserId: input.userId,
    confirmedAt: input.confirmedAt,
  };
}

export function dismissDeadlineReview(
  review: DeadlineReview,
  input: { userId: string; dismissedAt: string },
): DeadlineReview {
  if (review.status !== "pending_review") {
    throw new Error("Somente prazo pendente de revisão pode ser descartado.");
  }
  if (!input.userId.trim()) throw new Error("Usuário é obrigatório.");

  return {
    ...review,
    status: "dismissed",
    dismissedByUserId: input.userId,
    dismissedAt: input.dismissedAt,
  };
}
