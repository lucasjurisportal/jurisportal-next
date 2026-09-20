import test from "node:test";
import assert from "node:assert/strict";
import { buildGoogleEvent } from "./google-event";

test("prazo sem horário vira evento de dia inteiro", () => {
  const event = buildGoogleEvent({
    sourceType: "WORK_ITEM",
    sourceId: "work-1",
    organizationId: "org-1",
    title: "Protocolar recurso",
    date: "2026-09-20",
  });
  assert.equal(event.start.date, "2026-09-20");
  assert.equal(event.end.date, "2026-09-21");
  assert.equal(event.extendedProperties.private.jurisportalSourceId, "work-1");
});

test("tarefa com horário ganha duração padrão de 30 minutos", () => {
  const event = buildGoogleEvent({
    sourceType: "WORK_ITEM",
    sourceId: "work-2",
    organizationId: "org-1",
    title: "Ligar para cliente",
    date: "2026-09-20",
    startTime: "14:30",
  });
  assert.equal(event.start.dateTime, "2026-09-20T14:30:00-03:00");
  assert.equal(event.end.dateTime, "2026-09-20T15:00:00-03:00");
});

test("audiência respeita horário final informado", () => {
  const event = buildGoogleEvent({
    sourceType: "AGENDA_EVENT",
    sourceId: "agenda-1",
    organizationId: "org-1",
    title: "Audiência",
    date: "2026-09-21",
    startTime: "10:00",
    endTime: "11:45",
  });
  assert.equal(event.end.dateTime, "2026-09-21T11:45:00-03:00");
});
