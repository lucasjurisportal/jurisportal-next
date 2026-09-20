const TIME_ZONE = "America/Sao_Paulo";

export type GoogleCalendarEventPayload = {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties: {
    private: Record<string, string>;
  };
};

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMinutes(dateString: string, time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCHours(hours || 0, mins || 0, 0, 0);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return {
    date: date.toISOString().slice(0, 10),
    time: `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`,
  };
}

function localDateTime(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}

export function buildGoogleEvent(input: {
  sourceType: "WORK_ITEM" | "AGENDA_EVENT";
  sourceId: string;
  organizationId: string;
  title: string;
  description?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  defaultDurationMinutes?: number;
}) : GoogleCalendarEventPayload {
  const extendedProperties = {
    private: {
      jurisportalSourceType: input.sourceType,
      jurisportalSourceId: input.sourceId,
      jurisportalOrganizationId: input.organizationId,
    },
  };

  if (!input.startTime) {
    return {
      summary: input.title,
      description: input.description || undefined,
      start: { date: input.date },
      end: { date: addDays(input.date, 1) },
      extendedProperties,
    };
  }

  const end = input.endTime
    ? { date: input.date, time: input.endTime }
    : addMinutes(input.date, input.startTime, input.defaultDurationMinutes ?? 30);

  return {
    summary: input.title,
    description: input.description || undefined,
    start: { dateTime: localDateTime(input.date, input.startTime), timeZone: TIME_ZONE },
    end: { dateTime: localDateTime(end.date, end.time), timeZone: TIME_ZONE },
    extendedProperties,
  };
}
