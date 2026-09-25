/** Buckets operacionais. Atraso aqui é de atendimento no Jurisportal, não vencimento jurídico. */
export type NotificationBucket = "new" | "pending" | "late";
export const NOTIFICATION_NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
export const NOTIFICATION_LATE_AFTER_MS = 14 * NOTIFICATION_NEW_WINDOW_MS;

export function notificationBucket(input: { createdAt: Date; read: boolean }, now: Date): NotificationBucket {
  const elapsed = Math.max(0, now.getTime() - input.createdAt.getTime());
  if (elapsed > NOTIFICATION_LATE_AFTER_MS) return "late";
  if (!input.read && elapsed < NOTIFICATION_NEW_WINDOW_MS) return "new";
  return "pending";
}

export const NOTIFICATION_BUCKET_LABELS: Record<NotificationBucket, string> = {
  new: "Novos",
  pending: "Pendentes",
  late: "Atrasados",
};
