import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getNotifications, markNotificationsRead } from "@/modules/notifications/application/notification-service";

export async function GET() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const result = await getNotifications({
    organizationId: context.workspace.organizationId,
    userId: context.user.id,
    role: context.workspace.role,
    take: 20,
  });
  return NextResponse.json({
    notifications: result.notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    unreadCount: result.unreadCount,
    counts: result.counts,
    truncated: result.truncated,
  });
}

export async function PATCH(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const payload = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = Array.isArray(payload?.ids) ? payload.ids.filter((item): item is string => typeof item === "string") : [];
  const result = await markNotificationsRead({ organizationId: context.workspace.organizationId, userId: context.user.id, role: context.workspace.role, ids });
  return NextResponse.json({ ok: true, ...result });
}
