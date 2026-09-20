import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";
import { syncOrganizationDjen } from "@/modules/publications/application/djen-capture-service";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const platformMaster = await isPlatformMaster(context.user.id);
  const allowedManualSync = process.env.NODE_ENV !== "production" || platformMaster;
  if (!allowedManualSync) {
    return NextResponse.json({ error: "MANUAL_DJEN_SYNC_DISABLED" }, { status: 403 });
  }

  try {
    const result = await syncOrganizationDjen({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DJEN_SYNC_FAILED";
    if (message === "DJEN_NOT_AVAILABLE_FOR_PLAN") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[publications.sync]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
