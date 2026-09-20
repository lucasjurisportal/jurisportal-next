import { digitsOnly, isValidCnpj, isValidCpf } from "@/modules/clients/domain/tax-id";
import { z } from "zod";

const uf = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "UF inválida.");
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const accountSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
});

export const officeSettingsSchema = z.object({
  officeName: z.string().trim().min(2).max(160),
  legalName: optionalText(180),
  taxId: optionalText(24),
  adminEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  whatsapp: optionalText(30),
  postalCode: z.string().trim().min(8).max(10),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(40),
  complement: optionalText(120),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: uf,
}).superRefine((data, ctx) => {
  const taxId = digitsOnly(data.taxId || "");
  if (taxId && !isValidCpf(taxId) && !isValidCnpj(taxId)) {
    ctx.addIssue({ code: "custom", path: ["taxId"], message: "CPF/CNPJ inválido." });
  }
});

export const notificationSettingsSchema = z.object({
  publicationsEmail: z.boolean(),
  publicationsWhatsapp: z.boolean(),
  deadlinesEmail: z.boolean(),
  deadlinesWhatsapp: z.boolean(),
  syncFailureEmail: z.boolean(),
  syncFailureWhatsapp: z.boolean(),
  dailyOwnerReportEmail: z.boolean(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>;
export type OfficeSettingsInput = z.infer<typeof officeSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
