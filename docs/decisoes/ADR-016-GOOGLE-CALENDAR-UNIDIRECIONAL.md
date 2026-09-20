# ADR-016 — Google Calendar unidirecional

## Status
Aceito — v32.

## Contexto
Prazos jurídicos não podem ser alterados silenciosamente porque alguém arrastou um evento no celular. Ao mesmo tempo, o advogado precisa ver compromissos no calendário que já usa diariamente.

## Decisão
O Jurisportal é a fonte de verdade e envia eventos ao Google Calendar. A primeira versão não importa alterações do Google de volta para o Jurisportal.

## Motivos
1. reduz risco de alteração acidental de prazo;
2. elimina conflitos de sincronização bidirecional no MVP;
3. mantém auditoria jurídica dentro do Jurisportal;
4. permite evolução futura sem alterar o modelo de domínio.

## Idempotência
Cada origem possui um único `external_calendar_event_link` por organização/provedor. O `eventId` do Google é reutilizado em atualizações para evitar duplicidade.

## Escopo OAuth
Usar `https://www.googleapis.com/auth/calendar.events.owned`, mais restrito do que acesso total ao Calendar.

## Futuro
Uma eventual sincronização Google -> Jurisportal deverá tratar eventos externos como sugestão/alteração pendente e nunca alterar prazos jurídicos confirmados sem fluxo auditado.
