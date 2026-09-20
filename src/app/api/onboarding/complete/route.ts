import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";
import { completeOnboarding } from "@/modules/onboarding/application/complete-onboarding";
import { completeOnboardingSchema } from "@/modules/onboarding/domain/onboarding.schema";

function readTrustedIp(requestHeaders: Headers): string | null {
  return requestHeaders.get("cf-connecting-ip") ?? requestHeaders.get("x-real-ip");
}

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user || !session.session) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_ONBOARDING_DATA",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  try {
    const result = await completeOnboarding(parsed.data, {
      userId: session.user.id,
      sessionId: session.session.id,
      userAgent: requestHeaders.get("user-agent"),
      ipAddress: readTrustedIp(requestHeaders),
    });

    return NextResponse.json({ ok: true, workspace: result });
  } catch (error) {
    console.error("[onboarding.complete]", error);
    return NextResponse.json({ error: "ONBOARDING_FAILED" }, { status: 500 });
  }
}
