import { z } from "zod";

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();
const optionalDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional();
const optionalTime = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional();

export const globalWorkItemCreateSchema = z.object({
  processId: z.string().uuid("Selecione o processo."),
  kind: z.enum(["DEADLINE", "TASK"]),
  title: z.string().trim().min(2, "Informe um título.").max(180),
  dueDate: optionalDate,
  dueTime: optionalTime,
  responsibleUserId: optionalUuid,
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  isFatal: z.boolean().default(false),
  notes: z.string().trim().max(3000).optional().default(""),
}).superRefine((value, ctx) => {
  if (value.kind === "DEADLINE" && !value.dueDate) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Prazo precisa de uma data." });
  }
});

export const taskEditSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(180),
  dueDate: optionalDate,
  dueTime: optionalTime,
  responsibleUserId: optionalUuid,
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  notes: z.string().trim().max(3000).optional().default(""),
});

export const globalWorkItemStatusSchema = z.object({ status: z.enum(["OPEN", "DONE"]) });

export type GlobalWorkItemCreateInput = z.infer<typeof globalWorkItemCreateSchema>;
export type TaskEditInput = z.infer<typeof taskEditSchema>;
