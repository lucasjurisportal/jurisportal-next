import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { decideDjenReview } from "@/modules/publications/application/djen-review-service";
import { dispatchPendingPublicationEmails } from "@/modules/publications/infrastructure/publication-email";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "djen.monitoring")) {
    return NextResponse.json({ error: "DJEN_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  }
  if (context.workspace.role !== "owner") {
    return NextResponse.json({ error: "DJEN_REVIEW_OWNER_REQUIRED" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (body?.decision !== "APPROVE" && body?.decision !== "DISMISS") {
    return NextResponse.json({ error: "DJEN_DECISION_INVALID" }, { status: 422 });
  }
  const { id } = await params;
  try {
    await decideDjenReview({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id, candidateId: id, decision: body.decision,
    });
    if (body.decision === "APPROVE") {
      await dispatchPendingPublicationEmails(context.workspace.organizationId)
        .catch(() => console.error("[djen.review.mail] EMAIL_DISPATCH_FAILED"));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DJEN_REVIEW_FAILED";
    const status = code === "DJEN_CANDIDATE_NOT_FOUND" ? 404
      : code === "DJEN_CANDIDATE_ALREADY_DECIDED" || code === "DJEN_CANDIDATE_CHANGED" || code === "DJEN_OAB_INACTIVE"
        ? 409 : 500;
    if (status === 500) console.error("[djen.review]", code);
    return NextResponse.json({ error: code }, { status });
  }
}
