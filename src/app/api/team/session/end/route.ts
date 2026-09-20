import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { endTeamSession, type TeamSessionEndReason } from "@/modules/team/application/team-session-service";

const ALLOWED_REASONS = new Set<TeamSessionEndReason>(["manual", "inactivity"]);

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = body?.reason as TeamSessionEndReason | undefined;
  if (!reason || !ALLOWED_REASONS.has(reason)) {
    return NextResponse.json({ error: "INVALID_SESSION_END_REASON" }, { status: 422 });
  }

  const result = await endTeamSession({
    organizationId: context.workspace.organizationId,
    userId: context.user.id,
    sessionId: context.session.id,
    reason,
  });

  return NextResponse.json({ ok: true, ...result });
}
