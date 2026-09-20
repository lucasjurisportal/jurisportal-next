import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";

const MAX_BYTES = 500 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "IMAGE_REQUIRED" }, { status: 422 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "IMAGE_TYPE_NOT_ALLOWED" }, { status: 422 });
  if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 422 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  await prisma.$transaction([
    prisma.user.update({ where: { id: context.user.id }, data: { image: dataUrl } }),
    prisma.auditEvent.create({ data: { organizationId: context.workspace.organizationId, actorUserId: context.user.id, category: "settings", action: "settings.profile_photo.updated", entityType: "user", entityId: context.user.id } }),
  ]);
  return NextResponse.json({ ok: true, image: dataUrl });
}

export async function DELETE() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: context.user.id }, data: { image: null } }),
    prisma.auditEvent.create({ data: { organizationId: context.workspace.organizationId, actorUserId: context.user.id, category: "settings", action: "settings.profile_photo.removed", entityType: "user", entityId: context.user.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
