export type ReportPreset = "month" | "30d" | "90d" | "year" | "custom";

export type ReportPeriod = {
  preset: ReportPreset;
  from: string;
  to: string;
  fromTimestamp: Date;
  toTimestampExclusive: Date;
  fromDate: Date;
  toDateExclusive: Date;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function saoPauloDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

function isoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addUtcDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysAgo(today: string, days: number) {
  return addUtcDays(today, -days);
}

function normalizeDate(value: string | undefined, fallback: string) {
  if (!value || !ISO_DATE.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : value;
}

export function resolveReportPeriod(input: {
  preset?: string;
  from?: string;
  to?: string;
  now?: Date;
}): ReportPeriod {
  const now = input.now ?? new Date();
  const { year, month, day } = saoPauloDateParts(now);
  const today = isoDate(year, month, day);
  const preset: ReportPreset = ["month", "30d", "90d", "year", "custom"].includes(input.preset ?? "")
    ? (input.preset as ReportPreset)
    : "month";

  let from = isoDate(year, month, 1);
  let to = today;

  if (preset === "30d") from = daysAgo(today, 29);
  if (preset === "90d") from = daysAgo(today, 89);
  if (preset === "year") from = isoDate(year, 1, 1);
  if (preset === "custom") {
    from = normalizeDate(input.from, from);
    to = normalizeDate(input.to, today);
  }

  if (from > to) [from, to] = [to, from];
  const afterTo = addUtcDays(to, 1);

  return {
    preset,
    from,
    to,
    // DateTime do sistema é filtrado pelo dia civil de São Paulo.
    fromTimestamp: new Date(`${from}T00:00:00-03:00`),
    toTimestampExclusive: new Date(`${afterTo}T00:00:00-03:00`),
    // Campos @db.Date são tratados como datas sem horário.
    fromDate: new Date(`${from}T00:00:00.000Z`),
    toDateExclusive: new Date(`${afterTo}T00:00:00.000Z`),
  };
}

export function reportPeriodLabel(period: Pick<ReportPeriod, "from" | "to">) {
  const format = (value: string) => value.split("-").reverse().join("/");
  return `${format(period.from)} a ${format(period.to)}`;
}
