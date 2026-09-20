import type { NextRequest } from "next/server";
import type { RequestSecurityMeta } from "./security-service";

export function getRequestSecurityMeta(request: NextRequest): RequestSecurityMeta {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  return {
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}
