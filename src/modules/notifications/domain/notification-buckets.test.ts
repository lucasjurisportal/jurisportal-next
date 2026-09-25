import assert from "node:assert/strict";
import test from "node:test";
import { notificationBucket, NOTIFICATION_LATE_AFTER_MS, NOTIFICATION_NEW_WINDOW_MS } from "./notification-buckets";

const now = new Date("2026-09-24T18:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

test("comunicação nova e não lida aparece em Novos", () => {
  assert.equal(notificationBucket({ createdAt: ago(5000), read: false }, now), "new");
});
test("abrir a notificação não encerra a pendência", () => {
  assert.equal(notificationBucket({ createdAt: ago(5000), read: true }, now), "pending");
});
test("não lida após 24 horas passa a Pendentes", () => {
  assert.equal(notificationBucket({ createdAt: ago(NOTIFICATION_NEW_WINDOW_MS), read: false }, now), "pending");
});
test("passados 14 dias sem tratamento passa a Atrasados, mesmo que tenha sido lida", () => {
  assert.equal(notificationBucket({ createdAt: ago(NOTIFICATION_LATE_AFTER_MS + 1), read: true }, now), "late");
  assert.equal(notificationBucket({ createdAt: ago(NOTIFICATION_LATE_AFTER_MS), read: false }, now), "pending");
});
test("data futura não coloca alerta em atraso", () => {
  assert.equal(notificationBucket({ createdAt: new Date(now.getTime() + 1000), read: false }, now), "new");
});
