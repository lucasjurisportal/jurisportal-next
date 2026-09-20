import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { clientInputSchema } from "@/modules/clients/domain/client.schema";
import { createClient, listClients } from "@/modules/clients/application/client-service";

export async function GET(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const kind = url.searchParams.get("kind");
  const status = url.searchParams.get("status");

  const result = await listClients({
    organizationId: context.workspace.organizationId,
    page: Number.isFinite(page) ? page : 1,
    query: url.searchParams.get("q") || undefined,
    kind: kind === "PF" || kind === "PJ" ? kind : undefined,
    status: status === "ACTIVE" || status === "ARCHIVED" ? status : undefined,
    state: url.searchParams.get("state") || undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = clientInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CLIENT", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  try {
    const client = await createClient({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      clientLimit: context.workspace.plan.clientsLimit,
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, client }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CLIENT_CREATE_FAILED";
    if (message === "CLIENT_LIMIT_REACHED") return NextResponse.json({ error: message }, { status: 409 });
    if (message === "CLIENT_DUPLICATE_TAX_ID") return NextResponse.json({ error: message }, { status: 409 });
    console.error("[clients.create]", error);
    return NextResponse.json({ error: "CLIENT_CREATE_FAILED" }, { status: 500 });
  }
}
