import { z } from "zod";

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();
const optionalDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional();
const optionalTime = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional();

export const manualTimelineEventSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(160),
  description: z.string().trim().max(3000).optional().default(""),
});

export const processWorkItemSchema = z.object({
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

export const workItemStatusSchema = z.object({
  status: z.enum(["OPEN", "DONE"]),
});

export const feeAgreementSchema = z.object({
  model: z.enum(["FIXED", "PERCENTAGE", "FIXED_PLUS_PERCENTAGE", "MANUAL"]),
  fixedAmount: z.union([z.number().nonnegative(), z.null()]).optional(),
  contractedAmount: z.union([z.number().nonnegative(), z.null()]).optional(),
  successPercentage: z.union([z.number().min(0).max(100), z.null()]).optional(),
  percentageBase: z.enum(["CASE_VALUE"]).default("CASE_VALUE"),
  successBase: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(3000).optional().default(""),
}).superRefine((value, ctx) => {
  if ((value.model === "FIXED" || value.model === "FIXED_PLUS_PERCENTAGE") && (!value.fixedAmount || value.fixedAmount <= 0)) {
    ctx.addIssue({ code: "custom", path: ["fixedAmount"], message: "Informe a parcela fixa dos honorários." });
  }
  if ((value.model === "PERCENTAGE" || value.model === "FIXED_PLUS_PERCENTAGE") && (!value.successPercentage || value.successPercentage <= 0)) {
    ctx.addIssue({ code: "custom", path: ["successPercentage"], message: "Informe o percentual dos honorários." });
  }
  if (value.model === "MANUAL" && (!value.contractedAmount || value.contractedAmount <= 0)) {
    ctx.addIssue({ code: "custom", path: ["contractedAmount"], message: "Informe o valor contratado." });
  }
});

export const financeEntrySchema = z.object({
  kind: z.enum(["FEE_RECEIPT", "COST", "REIMBURSEMENT"]),
  description: z.string().trim().min(2, "Informe a descrição.").max(180),
  amount: z.number().positive("Informe um valor maior que zero."),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  status: z.enum(["PENDING", "PAID"]),
  paidBy: z.string().trim().max(80).optional().default(""),
  reimbursable: z.boolean().default(false),
  notes: z.string().trim().max(3000).optional().default(""),
});

export type ManualTimelineEventInput = z.infer<typeof manualTimelineEventSchema>;
export type ProcessWorkItemInput = z.infer<typeof processWorkItemSchema>;
export type FeeAgreementInput = z.infer<typeof feeAgreementSchema>;
export type FinanceEntryInput = z.infer<typeof financeEntrySchema>;
