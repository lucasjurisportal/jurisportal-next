export function processStatusLabel(value: string) {
  if (value === "ACTIVE") return "Ativo";
  if (value === "CLOSED") return "Encerrado";
  if (value === "ARCHIVED") return "Arquivado";
  return value;
}

export function workKindLabel(value: string) {
  return value === "DEADLINE" ? "Prazo" : value === "TASK" ? "Tarefa" : value;
}

export function workStatusLabel(value: string) {
  return value === "DONE" ? "Concluído" : value === "OPEN" ? "Pendente" : value;
}

export function financeKindLabel(value: string) {
  if (value === "FEE_RECEIPT") return "Honorário / recebimento";
  if (value === "COST") return "Custo / despesa";
  if (value === "REIMBURSEMENT") return "Reembolso";
  return value;
}

export function financeStatusLabel(value: string) {
  return value === "PAID" ? "Pago / recebido" : value === "PENDING" ? "Pendente" : value;
}

export function publicationStatusLabel(input: { sourceStatus: string; readAt: Date | null; treatedAt: Date | null }) {
  if (input.sourceStatus !== "ACTIVE") return "Cancelada na origem";
  if (input.treatedAt) return "Tratada";
  if (input.readAt) return "Lida";
  return "Nova";
}
