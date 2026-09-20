import { z } from "zod";

export const teamAccessLevelSchema = z.enum(["LEVEL_2", "LEVEL_1"]);

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(190),
  jobTitle: z.string().trim().max(100).optional().nullable(),
  accessLevel: teamAccessLevelSchema,
  oabState: z.string().trim().toUpperCase().length(2),
  oabNumber: z.string().trim().min(1).max(30),
  provisionalPassword: z.string().min(8).max(128),
});

export type TeamAccessLevel = z.infer<typeof teamAccessLevelSchema>;
