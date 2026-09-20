import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { supportRequestSchema } from "@/modules/settings/domain/support.schema";
import { sendSupportEmail } from "@/modules/settings/infrastructure/support-email";

function roleLabel(role: string) {
  if (role === "owner") return "Proprietário";
  return role === "admin" ? "Administrador" : "Equipe";
}

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const parsed = supportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_SUPPORT_REQUEST", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  const topic = parsed.data.topic === "Outro" ? parsed.data.otherTopic!.trim() : parsed.data.topic;
  try {
    const messageId = await sendSupportEmail({
      requesterName: context.user.name,
      requesterEmail: context.user.email,
      officeName: context.workspace.organizationName,
      role: roleLabel(context.workspace.role),
      topic,
      message: parsed.data.message,
    });
    await prisma.auditEvent.create({
      data: {
        organizationId: context.workspace.organizationId,
        actorUserId: context.user.id,
        category: "settings",
        action: "settings.support.sent",
        entityType: "support_request",
        entityId: messageId ?? undefined,
        metadata: { topic },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[settings.support]", error);
    const code = error instanceof Error ? error.message : "SUPPORT_SEND_FAILED";
    return NextResponse.json({ error: code }, { status: code.includes("NOT_CONFIGURED") ? 503 : 500 });
  }
}
