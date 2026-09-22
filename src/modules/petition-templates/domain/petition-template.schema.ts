import { z } from "zod";
import { decodeRichDocument, richToPlain } from "./rich-document";

export const petitionTemplateInputSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do modelo.").max(160),
  category: z.string().trim().min(2, "Informe a categoria.").max(80),
  scope: z.enum(["CLIENT", "PROCESS", "GENERAL"]),
  content: z.string().trim().min(20, "O modelo precisa ter conteúdo.").max(120000).refine((value) => {
    try { return richToPlain(decodeRichDocument(value)).trim().length >= 20; }
    catch { return false; }
  }, "O modelo precisa conter texto válido."),
});

export const petitionDraftInputSchema = z.object({
  source: z.enum(["OFFICIAL", "OFFICE"]),
  templateId: z.string().uuid().optional(),
  officialSlug: z.string().trim().min(1).optional(),
  processId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.source === "OFFICIAL" && !value.officialSlug) {
    ctx.addIssue({ code: "custom", path: ["officialSlug"], message: "Modelo oficial inválido." });
  }
  if (value.source === "OFFICE" && !value.templateId) {
    ctx.addIssue({ code: "custom", path: ["templateId"], message: "Modelo do escritório inválido." });
  }
});

export type PetitionTemplateInput = z.infer<typeof petitionTemplateInputSchema>;
