import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { removeTeamMember } from "@/modules/team/application/team-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "team.members")) return NextResponse.json({ error: "TEAM_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const { id } = await params;
  try { await removeTeamMember({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, userId: id }); return NextResponse.json({ ok: true }); }
  catch (error) { const code=error instanceof Error?error.message:"TEAM_MEMBER_REMOVE_FAILED"; if(code==="TEAM_OWNER_REQUIRED")return NextResponse.json({error:code},{status:403}); if(code==="TEAM_MEMBER_NOT_FOUND")return NextResponse.json({error:code},{status:404}); if(code.startsWith("TEAM_OWNER_"))return NextResponse.json({error:code},{status:409}); console.error("[team.remove]",error); return NextResponse.json({error:"TEAM_MEMBER_REMOVE_FAILED"},{status:500}); }
}
