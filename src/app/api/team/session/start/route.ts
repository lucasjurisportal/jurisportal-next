import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { startTeamSession } from "@/modules/team/application/team-session-service";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const result = await startTeamSession({
    organizationId: context.workspace.organizationId,
    userId: context.user.id,
    sessionId: context.session.id,
  });

  return NextResponse.json({ ok: true, ...result });
}
