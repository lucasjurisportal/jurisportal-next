import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import {
  getLatestPublicationSummary,
  runPublicationSummary,
} from "@/modules/ai/application/publication-summary-service";

function publicError(code: string) {
  if (code === "AI_ACTION_NOT_INCLUDED") return { status: 403, error: code };
  if (code === "AI_PLAN_UNAVAILABLE") return { status: 403, error: code };
  if (code === "AI_CREDITS_INSUFFICIENT") return { status: 402, error: code };
  if (code === "AI_PROVIDER_DISABLED" || code === "AI_PROVIDER_NOT_CONFIGURED" || code.startsWith("AI_MODEL_")) {
    return { status: 503, error: "AI_PROVIDER_NOT_READY" };
  }
  if (code === "PUBLICATION_NOT_FOUND") return { status: 404, error: code };
  if (code === "PUBLICATION_CONTENT_EMPTY") return { status: 422, error: code };
  if (code === "AI_REQUEST_KEY_INVALID") return { status: 400, error: code };
  if (code === "AI_REQUEST_KEY_CONFLICT" || code === "AI_REQUEST_ALREADY_CLOSED") return { status: 409, error: code };
  if (code.startsWith("AI_PROVIDER_")) return { status: 502, error: "AI_PROVIDER_FAILED" };
  return { status: 500, error: "AI_SUMMARY_FAILED" };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;
  try {
    const summary = await getLatestPublicationSummary(context.workspace.organizationId, id);
    return NextResponse.json({ summary });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "AI_SUMMARY_FAILED";
    const mapped = publicError(code);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { requestKey?: unknown } | null;
  if (!body || typeof body.requestKey !== "string") {
    return NextResponse.json({ error: "AI_REQUEST_KEY_INVALID" }, { status: 400 });
  }

  try {
    const result = await runPublicationSummary({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      planSlug: context.workspace.plan.slug,
      publicationId: id,
      requestKey: body.requestKey,
    });
    return NextResponse.json(result);
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "AI_SUMMARY_FAILED";
    const mapped = publicError(code);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
