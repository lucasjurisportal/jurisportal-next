# Bloco 24 — Google Calendar funcional

## Objetivo
Conectar a agenda individual de cada usuário do Jurisportal ao Google Calendar sem transformar o Google em fonte de verdade jurídica.

## Regra central
- Jurisportal é a fonte oficial de prazo, tarefa, audiência e compromisso.
- A primeira versão é unidirecional: Jurisportal -> Google Calendar.
- Alterar ou apagar um evento diretamente no Google **não** modifica o prazo/tarefa dentro do Jurisportal.
- Não existe duplicação local de prazo na Agenda. A integração externa apenas projeta o registro existente.

## Fluxo OAuth
1. Usuário autenticado abre Agenda.
2. Clica em `Conectar Google Calendar`.
3. `/api/integrations/google-calendar/connect` cria um `state` aleatório em cookie HttpOnly.
4. Google pede consentimento para `calendar.events.owned`.
5. Callback valida `state` e troca o `code` por tokens.
6. Tokens são cifrados com AES-256-GCM antes de irem ao PostgreSQL.
7. Conexão fica vinculada a `organizationId + userId`.

## Variáveis de ambiente
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- `GOOGLE_CALENDAR_TOKEN_KEY`

Nunca colocar valores reais em Git, documentação ou tickets.

## Banco
### `google_calendar_connection`
Conexão OAuth de um usuário dentro de uma organização. Tokens nunca são persistidos em texto puro.

### `external_calendar_event_link`
Mantém a ligação idempotente:
`WORK_ITEM/AGENDA_EVENT -> eventId do Google`.

Esse modelo é genérico de propósito para permitir Outlook no futuro.

## O que sincroniza
- Prazo aberto com data.
- Tarefa aberta com data.
- Audiência.
- Compromisso.

Destino:
- responsável do item, quando existir;
- caso contrário, criador do item.

A pessoa de destino precisa ter conectado o próprio Google Calendar.

## Comportamento
- criação local -> `events.insert`;
- alteração de tarefa -> `events.patch`;
- conclusão de prazo/tarefa -> remove o evento externo, preservando todo o histórico no Jurisportal;
- reabertura -> recria/sincroniza o evento;
- `Sincronizar agora` -> reprocessa até 100 itens por tipo nos próximos 90 dias para o usuário atual.

## Falha do Google
Falha externa não desfaz a operação local.
- O dado jurídico continua salvo.
- Erro de sincronização é registrado em `external_calendar_event_link` quando já existe vínculo.
- Usuário pode tentar `Sincronizar agora`.

## Segurança
- OAuth `state` anti-CSRF.
- Escopo mínimo `calendar.events.owned`.
- refresh/access tokens cifrados em repouso.
- token de usuário isolado por organização.
- Client Secret e chave de cifragem apenas no servidor.

## Limitações desta versão
- Não lê alterações feitas diretamente no Google.
- Não escolhe calendários secundários; usa `primary`.
- Não cria Google Meet.
- Não sincroniza eventos anteriores automaticamente.
- Sincronização ocorre na própria requisição; migrar para fila/job quando volume justificar.
