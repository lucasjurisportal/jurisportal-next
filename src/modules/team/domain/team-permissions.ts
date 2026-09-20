export type JurisportalRole = "OWNER" | "LEVEL_2" | "LEVEL_1";
export type TeamPermission = "team.view" | "team.manage" | "audit.view" | "operations.write" | "finance.write";

const permissions: Record<JurisportalRole, readonly TeamPermission[]> = {
  OWNER: ["team.view", "team.manage", "audit.view", "operations.write", "finance.write"],
  LEVEL_2: ["team.view", "audit.view", "operations.write", "finance.write"],
  LEVEL_1: ["team.view", "operations.write"],
};

export function normalizeJurisportalRole(memberRole: string, accessLevel?: string | null): JurisportalRole {
  if (memberRole === "owner") return "OWNER";
  if (accessLevel === "LEVEL_2") return "LEVEL_2";
  return "LEVEL_1";
}

export function hasTeamPermission(role: JurisportalRole, permission: TeamPermission) {
  return permissions[role].includes(permission);
}
