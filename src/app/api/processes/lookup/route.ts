import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { isProcessLookupEnabled, lookupDatajudProcess } from "@/modules/integrations/process-metadata/infrastructure/datajud-client";
import { isStructurallyValidCnj } from "@/modules/processes/domain/cnj-number";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!isProcessLookupEnabled()) return NextResponse.json({ error: "PROCESS_LOOKUP_DISABLED" }, { status: 503 });
  const raw = await request.json().catch(() => null) as { cnj?: unknown } | null;
  if (!raw || typeof raw.cnj !== "string" || !isStructurallyValidCnj(raw.cnj))
    return NextResponse.json({ error: "PROCESS_LOOKUP_INVALID_CNJ" }, { status: 422 });
  try {
    const preview = await lookupDatajudProcess(raw.cnj);
    if (!preview) return NextResponse.json({ error: "PROCESS_LOOKUP_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ preview }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROCESS_LOOKUP_SOURCE_UNAVAILABLE";
    const status = message === "PROCESS_LOOKUP_COURT_UNSUPPORTED" ? 422
      : message === "PROCESS_LOOKUP_MULTIPLE_MATCHES" ? 409
      : message === "PROCESS_LOOKUP_RATE_LIMIT" ? 429 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
