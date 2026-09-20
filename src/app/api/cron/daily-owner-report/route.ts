import { NextResponse } from "next/server";
import { sendDailyOwnerReports } from "@/modules/reports/application/daily-owner-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET_NOT_CONFIGURED" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await sendDailyOwnerReports();
  return NextResponse.json({ ok: true, ...result });
}
