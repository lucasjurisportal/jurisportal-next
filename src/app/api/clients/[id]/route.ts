import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { clientInputSchema } from "@/modules/clients/domain/client.schema";
import { deleteClientPermanently, getClient, setClientArchived, updateClient } from "@/modules/clients/application/client-service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const client = await getClient(context.workspace.organizationId, id);
  if (!client) return NextResponse.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = clientInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CLIENT", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    const client = await updateClient({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, clientId: id, data: parsed.data });
    return NextResponse.json({ ok: true, client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CLIENT_UPDATE_FAILED";
    if (message === "CLIENT_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "CLIENT_DUPLICATE_TAX_ID") return NextResponse.json({ error: message }, { status: 409 });
    console.error("[clients.update]", error);
    return NextResponse.json({ error: "CLIENT_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const archived = typeof body === "object" && body !== null && "archived" in body ? Boolean((body as { archived?: unknown }).archived) : null;
  if (archived === null) return NextResponse.json({ error: "INVALID_ARCHIVE_STATE" }, { status: 422 });

  try {
    const client = await setClientArchived({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, clientId: id, archived });
    return NextResponse.json({ ok: true, client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CLIENT_UPDATE_FAILED";
    if (message === "CLIENT_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    console.error("[clients.archive]", error);
    return NextResponse.json({ error: "CLIENT_UPDATE_FAILED" }, { status: 500 });
  }
}


export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;

  try {
    await deleteClientPermanently({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      actorRole: context.workspace.role,
      clientId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CLIENT_DELETE_FAILED";
    if (message === "CLIENT_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "CLIENT_DELETE_FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
    if (message === "CLIENT_HAS_PROCESS_LINKS") return NextResponse.json({ error: message }, { status: 409 });
    console.error("[clients.delete]", error);
    return NextResponse.json({ error: "CLIENT_DELETE_FAILED" }, { status: 500 });
  }
}
