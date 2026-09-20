import { z } from "zod";

export const supportTopics = [
  "Problema no sistema",
  "Dúvida de uso",
  "Publicações e intimações",
  "Processos",
  "Clientes",
  "Prazos e tarefas",
  "Equipe",
  "Importação de dados",
  "Conta e acesso",
  "Plano e cobrança",
  "Outro",
] as const;

export const supportRequestSchema = z.object({
  topic: z.enum(supportTopics),
  otherTopic: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Descreva sua solicitação com um pouco mais de detalhe.").max(5000),
}).superRefine((value, ctx) => {
  if (value.topic === "Outro" && !value.otherTopic?.trim()) {
    ctx.addIssue({ code: "custom", path: ["otherTopic"], message: "Informe o assunto da solicitação." });
  }
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
