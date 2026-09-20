import { z } from "zod";

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();
const optionalTime = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional();

export const agendaEventSchema = z.object({
  type: z.enum(["HEARING", "COMMITMENT"]),
  title: z.string().trim().min(2, "Informe um título.").max(180),
  processId: optionalUuid,
  responsibleUserId: optionalUuid,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  startTime: optionalTime,
  endTime: optionalTime,
  notes: z.string().trim().max(3000).optional().default(""),
});

export type AgendaEventInput = z.infer<typeof agendaEventSchema>;
