import { z } from "zod";
import { isStructurallyValidCnj } from "./cnj-number";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const partySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da parte.").max(180),
  role: z.string().trim().min(2, "Informe o papel da parte no processo.").max(80),
  document: optionalText(30),
});

export const processInputSchema = z.object({
  cnj: z.string().trim().refine(isStructurallyValidCnj, "Informe um número CNJ com 20 dígitos."),
  primaryClientId: z.string().uuid("Selecione o cliente principal."),
  additionalClientIds: z.array(z.string().uuid()).max(30).default([]),
  responsibleUserId: z.string().uuid().optional().or(z.literal("")),
  court: optionalText(120),
  division: optionalText(120),
  district: optionalText(120),
  processClass: optionalText(120),
  subject: optionalText(300),
  caseValue: z.union([z.number().nonnegative("Valor da causa não pode ser negativo."), z.null()]).optional(),
  distributionDate: optionalText(10),
  notes: optionalText(4000),
  parties: z.array(partySchema).max(30).default([]),
});

export type ProcessInput = z.infer<typeof processInputSchema>;

export const processCreateInputSchema = processInputSchema.extend({
  confirmCnj: z.literal(true),
});

export const processUpdateInputSchema = processInputSchema.extend({
  cnjCorrectionReason: optionalText(500),
});
