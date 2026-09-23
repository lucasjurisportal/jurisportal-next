/** Datas mostradas no resumo do DJeN. Sexta fica visível até a segunda-feira. */
export function recentDjenDays(today: string): string[] {
  const date = new Date(`${today}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== today) throw new Error("INVALID_DJEN_DAY");
  const dow = date.getUTCDay();
  const count = dow === 1 ? 4 : dow === 0 ? 3 : 2;
  const days: string[] = [];
  for (let index = count - 1; index >= 0; index--) {
    const copy = new Date(date);
    copy.setUTCDate(date.getUTCDate() - index);
    days.push(copy.toISOString().slice(0, 10));
  }
  return days;
}
