import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getRequestSecurityMeta } from "@/modules/security/application/request-context";
import { sendSecurityChallenge } from "@/modules/security/application/security-service";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified) {
    return NextResponse.json({ error: "VERIFIED_EMAIL_REQUIRED" }, { status: 400 });
  }

  try {
    const result = await sendSecurityChallenge({
      userId: user.id,
      sessionId: session.session.id,
      purpose: "ACCOUNT_RECOVERY",
      channel: "email",
      email: user.email,
      meta: getRequestSecurityMeta(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[security] Falha ao enviar recuperação", error);
    return NextResponse.json({ error: "DELIVERY_FAILED" }, { status: 503 });
  }
}
