import test from "node:test";
import assert from "node:assert/strict";
import { financeEntrySchema, processWorkItemSchema } from "./process-workspace.schema";

test("aceita prazo manual com data e horário", () => {
  const result = processWorkItemSchema.safeParse({
    kind: "DEADLINE",
    title: "Protocolar manifestação",
    dueDate: "2026-09-20",
    dueTime: "18:00",
    responsibleUserId: "",
    priority: "HIGH",
    isFatal: true,
    notes: "",
  });
  assert.equal(result.success, true);
});

test("rejeita valor financeiro igual a zero", () => {
  const result = financeEntrySchema.safeParse({
    kind: "COST",
    description: "Custas iniciais",
    amount: 0,
    entryDate: "2026-09-15",
    status: "PAID",
    paidBy: "Escritório",
    reimbursable: true,
    notes: "",
  });
  assert.equal(result.success, false);
});
