import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { syncOrganizationDjen } from "@/modules/publications/application/djen-capture-service";
import { dispatchPendingPublicationEmails } from "@/modules/publications/infrastructure/publication-email";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const failed = await prisma.djenCaptureCursor.count({
    where: { organizationId: context.workspace.organizationId, status: "ERROR" },
  });
  const allowedManualSync = context.workspace.role === "owner" &&
    (process.env.NODE_ENV !== "production" || failed > 0);
  if (!allowedManualSync) {
    return NextResponse.json({ error: "MANUAL_DJEN_SYNC_DISABLED" }, { status: 403 });
  }

  try {
    const result = await syncOrganizationDjen({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
    });
    // Uma tentativa manual por falha agendada. Mesmo se falhar novamente,
    // o botão só volta quando a próxima captura automática registrar ERROR.
    await prisma.djenCaptureCursor.updateMany({
      where: { organizationId: context.workspace.organizationId, status: "ERROR" },
      data: { status: "MANUAL_ERROR" },
    });
    // Falha do provedor não desfaz a captura. O envio fica auditado para retry.
    const mail = await dispatchPendingPublicationEmails(context.workspace.organizationId)
      .catch(() => ({ disabled: false, sent: 0, errors: 1 }));
    return NextResponse.json({ ok: result.errors.length === 0, result, mail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DJEN_SYNC_FAILED";
    if (message === "DJEN_NOT_AVAILABLE_FOR_PLAN") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[publications.sync]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
