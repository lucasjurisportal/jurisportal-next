import { z } from "zod";
import { digitsOnly, isValidCnpj, isValidCpf } from "./tax-id";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const clientInputSchema = z.object({
  kind: z.enum(["PF", "PJ"]),
  name: z.string().trim().min(2, "Informe o nome ou razão social.").max(180),
  tradeName: optionalText(180),
  taxId: z.string().trim().min(1, "Informe o CPF/CNPJ."),
  birthDate: optionalText(10),
  primaryContactName: optionalText(160),
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  whatsapp: z.string().trim().min(10, "Informe o WhatsApp com DDD.").max(20),
  phone: optionalText(20),
  postalCode: z.string().trim().min(8, "Informe o CEP.").max(10),
  street: z.string().trim().min(2, "Informe o logradouro.").max(180),
  number: z.string().trim().min(1, "Informe o número.").max(30),
  complement: optionalText(120),
  district: z.string().trim().min(2, "Informe o bairro.").max(120),
  city: z.string().trim().min(2, "Informe a cidade.").max(120),
  state: z.enum(BRAZILIAN_STATES),
  notes: optionalText(4000),
}).superRefine((data, ctx) => {
  const taxId = digitsOnly(data.taxId);
  if (data.kind === "PF" && !isValidCpf(taxId)) {
    ctx.addIssue({ code: "custom", path: ["taxId"], message: "CPF inválido." });
  }
  if (data.kind === "PJ" && !isValidCnpj(taxId)) {
    ctx.addIssue({ code: "custom", path: ["taxId"], message: "CNPJ inválido." });
  }
  if (data.kind === "PJ" && !data.primaryContactName?.trim()) {
    ctx.addIssue({ code: "custom", path: ["primaryContactName"], message: "Informe o contato principal." });
  }
  if (data.kind === "PF" && data.birthDate) {
    const date = new Date(`${data.birthDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || data.birthDate.length !== 10) {
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Data de nascimento inválida." });
    }
  }
});

export type ClientInput = z.infer<typeof clientInputSchema>;
