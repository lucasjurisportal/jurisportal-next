export const LAST_INTERACTION_STORAGE_KEY = "jurisportal:last-interaction-at";
export const STAFF_ACTIVE_WINDOW_MS = 10 * 60 * 1000;
export const STAFF_LOGOUT_WINDOW_MS = 30 * 60 * 1000;
export const ADMIN_LOGOUT_WINDOW_MS = 60 * 60 * 1000;

export type InactivityProfile = "ADMIN" | "STAFF";

export function resolveInactivityProfile(memberRole: string): InactivityProfile {
  return memberRole === "owner" || memberRole === "admin" ? "ADMIN" : "STAFF";
}

export function getLogoutWindowMs(memberRole: string): number {
  return resolveInactivityProfile(memberRole) === "ADMIN"
    ? ADMIN_LOGOUT_WINDOW_MS
    : STAFF_LOGOUT_WINDOW_MS;
}

export function shouldCountAsActive(memberRole: string, idleForMs: number): boolean {
  if (resolveInactivityProfile(memberRole) === "ADMIN") return false;
  return idleForMs < STAFF_ACTIVE_WINDOW_MS;
}
