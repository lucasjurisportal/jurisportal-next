import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getRequestSecurityMeta } from "@/modules/security/application/request-context";
import {
  getUserSecurityState,
  markSessionSecondFactorVerified,
  sendSecurityChallenge,
  validateTrustedDevice,
} from "@/modules/security/application/security-service";
import { TRUSTED_DEVICE_COOKIE } from "@/modules/security/domain/security-policy";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const teamProfile = await prisma.teamMemberProfile.findUnique({ where: { userId: user.id } });
  if (teamProfile?.status === "ACTIVE" && teamProfile.mustChangePassword) {
    return NextResponse.json({ next: "change_password" });
  }

  if (!user.emailVerified) {
    try {
      await sendSecurityChallenge({
        userId: user.id,
        sessionId: session.session.id,
        purpose: "EMAIL_VERIFICATION",
        channel: "email",
        email: user.email,
        meta: getRequestSecurityMeta(request),
      });
    } catch (error) {
      console.error("[security] Falha ao enviar confirmação de e-mail", error);
    }
    return NextResponse.json({ next: "verify_email" });
  }

  const state = await getUserSecurityState(user.id);
  if (state?.recoveryRequired) {
    return NextResponse.json({ next: "recovery" }, { status: 423 });
  }

  const persistedSession = await prisma.session.findFirst({
    where: { id: session.session.id, userId: user.id },
    select: { secondFactorVerifiedAt: true },
  });
  if (persistedSession?.secondFactorVerifiedAt) {
    return NextResponse.json({ next: "authenticated" });
  }

  const meta = getRequestSecurityMeta(request);
  const trusted = await validateTrustedDevice({
    userId: user.id,
    rawToken: request.cookies.get(TRUSTED_DEVICE_COOKIE)?.value,
    userAgent: meta.userAgent,
  });

  if (trusted) {
    await markSessionSecondFactorVerified(user.id, session.session.id);
    return NextResponse.json({ next: "authenticated" });
  }

  try {
    const challenge = await sendSecurityChallenge({
      userId: user.id,
      sessionId: session.session.id,
      purpose: "LOGIN_2FA",
      channel: "email",
      email: user.email,
      phone: user.profile?.phone,
      meta,
    });
    return NextResponse.json({ next: "verify_access", ...challenge });
  } catch (error) {
    console.error("[security] Falha ao enviar 2FA", error);
    return NextResponse.json({ error: "DELIVERY_FAILED" }, { status: 503 });
  }
}
