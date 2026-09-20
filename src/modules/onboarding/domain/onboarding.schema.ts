import { z } from "zod";

const uf = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "UF inválida.");
const planSlug = z.enum(["free", "essencial", "estrategico", "premium", "executivo", "alta-corte"]);
const billingCycle = z.enum(["monthly", "annual"]);

export const completeOnboardingSchema = z.object({
  officeName: z.string().trim().min(2, "Informe o nome do escritório.").max(160),
  phone: z.string().trim().min(8, "Informe o WhatsApp.").max(30),
  oabNumber: z.string().trim().min(1, "Informe a OAB.").max(30),
  oabState: uf,
  postalCode: z.string().trim().min(8).max(10),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(40),
  complement: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: uf,
  planSlug,
  billingCycle,
  acceptedTerms: z.literal(true),
  acknowledgedPrivacy: z.literal(true),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
