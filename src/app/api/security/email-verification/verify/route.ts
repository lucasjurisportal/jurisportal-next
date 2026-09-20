import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getRequestSecurityMeta } from "@/modules/security/application/request-context";
import {
  createTrustedDevice,
  verifyEmailForSession,
  verifySecurityChallenge,
} from "@/modules/security/application/security-service";
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_DAYS } from "@/modules/security/domain/security-policy";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { code?: string; rememberDevice?: boolean }
    | null;
  if (!body?.code) return NextResponse.json({ error: "CODE_REQUIRED" }, { status: 400 });

  const meta = getRequestSecurityMeta(request);
  const verification = await verifySecurityChallenge({
    userId: session.user.id,
    sessionId: session.session.id,
    purpose: "EMAIL_VERIFICATION",
    code: body.code,
    meta,
  });

  if (!verification.ok) {
    return NextResponse.json(verification, {
      status: verification.reason === "BLOCKED" ? 423 : 400,
    });
  }

  await verifyEmailForSession(session.user.id, session.session.id);

  const response = NextResponse.json({ ok: true });
  if (body.rememberDevice) {
    const device = await createTrustedDevice({
      userId: session.user.id,
      userAgent: meta.userAgent,
      meta,
      sessionId: session.session.id,
    });
    response.cookies.set(TRUSTED_DEVICE_COOKIE, device.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60,
      expires: device.expiresAt,
    });
  }

  // Garante leitura atualizada em chamadas seguintes.
  await prisma.user.findUnique({ where: { id: session.user.id } });
  return response;
}
