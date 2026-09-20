import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import {
  createTeamMember,
  getTeamUsage,
  listTeamMembers,
} from "@/modules/team/application/team-service";
import { createTeamMemberSchema } from "@/modules/team/domain/team.schema";

export async function GET() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "team.members")) {
    return NextResponse.json({ error: "TEAM_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  }

  const [members, usage] = await Promise.all([
    listTeamMembers(context.workspace.organizationId),
    getTeamUsage(context.workspace.organizationId),
  ]);

  return NextResponse.json({
    ok: true,
    members,
    limits: {
      users: context.workspace.plan.users,
      oabs: context.workspace.plan.oabs,
    },
    usage,
  });
}

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "team.members")) {
    return NextResponse.json({ error: "TEAM_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  }

  const parsed = createTeamMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_TEAM_MEMBER", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    const member = await createTeamMember({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      plan: context.workspace.plan,
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, member }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "TEAM_MEMBER_CREATE_FAILED";
    if (code === "TEAM_OWNER_REQUIRED") {
      return NextResponse.json({ error: code }, { status: 403 });
    }
    if (code === "TEAM_INVALID_OAB") {
      return NextResponse.json({ error: code }, { status: 422 });
    }
    if (
      [
        "TEAM_PLAN_USER_LIMIT_REACHED",
        "TEAM_PLAN_OAB_LIMIT_REACHED",
        "TEAM_EMAIL_ALREADY_IN_USE",
        "TEAM_OAB_ALREADY_IN_USE",
      ].includes(code)
    ) {
      return NextResponse.json({ error: code }, { status: 409 });
    }
    console.error("[team.create]", error);
    return NextResponse.json({ error: "TEAM_MEMBER_CREATE_FAILED" }, { status: 500 });
  }
}
