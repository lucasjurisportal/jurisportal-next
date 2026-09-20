import { z } from "zod";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const publicationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark-treated") }),
  z.object({ action: z.literal("link-process"), processId: uuid }),
  z.object({
    action: z.literal("confirm-deadline"),
    title: z.string().trim().min(3).max(180),
    dueDate: isoDate,
  }),
  z.object({ action: z.literal("dismiss-deadline") }),
  z.object({
    action: z.literal("create-task"),
    title: z.string().trim().min(3).max(180),
    dueDate: z.union([isoDate, z.literal("")]).optional(),
    responsibleUserId: z.union([uuid, z.literal("")]).optional(),
  }),
]);
