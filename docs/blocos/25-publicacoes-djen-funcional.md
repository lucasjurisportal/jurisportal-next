# Bloco 25 — Publicações e Intimações + DJeN funcional

## Objetivo
Trazer comunicações reais do DJeN para o Jurisportal Next, vinculá-las às OABs e processos do escritório e criar um fluxo seguro de revisão antes de qualquer prazo jurídico definitivo.

## Origem do núcleo
O bloco reaproveita somente as partes úteis do protótipo JurisAlert:
- cliente da API DJeN;
- normalização da resposta;
- identificação por OAB/UF;
- limpeza do HTML externo.

Não foram incorporados:
- aplicação JurisAlert inteira;
- deduplicação em arquivo JSON local;
- e-mail acoplado à captura;
- WhatsApp acoplado à captura;
- rotas de protótipo;
- armazenamento fora do PostgreSQL do Jurisportal.

## Arquitetura
A implementação permanece dentro do monólito modular:

```text
src/modules/integrations/djen/
  domain/
  infrastructure/

src/modules/publications/
  domain/
  application/

src/app/api/publications/
src/app/app/publicacoes/
src/components/publications/
```

O DJeN é uma integração externa isolada. O módulo de Publicações não depende da interface para funcionar.

## Multi-tenancy
Toda publicação persistida possui `organizationId`.

As consultas e ações do módulo recebem o escritório ativo e nunca pesquisam publicação, processo, OAB ou usuário fora dele.

As novas tabelas também têm RLS habilitado como segunda barreira, seguindo o padrão do projeto.

## Banco
### `publication`
Armazena a comunicação normalizada do DJeN.

Campos relevantes:
- organização;
- processo vinculado, quando identificado;
- fonte;
- chave externa de deduplicação;
- tipo da comunicação;
- tribunal e órgão;
- número CNJ bruto, normalizado e formatado;
- data de disponibilização;
- conteúdo sanitizado em texto puro;
- datas literalmente encontradas;
- estado da comunicação na origem;
- leitura e tratamento.

### `publication_recipient`
Liga uma comunicação às OABs do escritório atingidas por ela.

Uma comunicação permanece única mesmo quando mais de uma OAB do mesmo escritório aparece entre os destinatários.

### `deadline_review`
Representa a etapa humana entre comunicação e prazo.

Estados usados nesta versão:
- `PENDING_REVIEW`;
- `CONFIRMED`;
- `DISMISSED`;
- `SOURCE_CANCELLED`.

`SOURCE_CANCELLED` significa que o DJeN cancelou a comunicação antes de uma confirmação humana. Se um prazo já tiver sido confirmado pelo advogado, ele não é apagado silenciosamente.

## Deduplicação
A chave é única por:

```text
organizationId + source + externalKey
```

Prioridade para montar `externalKey`:
1. hash fornecido pela origem;
2. id externo;
3. SHA-256 determinístico dos dados normalizados.

Reprocessar a mesma janela é seguro e atualiza `lastSeenAt` sem criar cópias.

## Captura
`syncOrganizationDjen()`:
1. resolve o plano do escritório;
2. verifica capability `djen.monitoring`;
3. seleciona as OABs ativas dentro do limite do plano;
4. consulta o DJeN;
5. percorre todas as páginas;
6. normaliza e sanitiza cada item;
7. confirma a OAB/UF destinatária quando a origem fornece advogados;
8. deduplica;
9. tenta localizar o processo por CNJ dentro da mesma organização;
10. persiste publicação e destinatário;
11. cria a revisão de prazo;
12. registra timeline quando houver processo;
13. registra auditoria.

## Janela padrão
A função de captura usa ontem + hoje no fuso `America/Sao_Paulo`.

Isso cria sobreposição intencional. Como a gravação é idempotente, uma nova execução pode reencontrar itens sem duplicá-los.

## Paginação e falhas externas
- páginas de até 50 itens;
- limite defensivo de 200 páginas por consulta;
- repetição curta para página intermediária vazia;
- repetição controlada para timeout, HTTP 429 e falhas 5xx;
- HTTP 403 é exposto de forma específica para diagnóstico e não dispara mudança automática de arquitetura.

## Conteúdo externo
O HTML do DJeN não é renderizado diretamente.

Antes de salvar/exibir, a integração remove:
- `script`;
- `style`;
- tags HTML;
- atributos e handlers externos.

O resultado persistido é texto puro.

## Vínculo com processo
Quando o número CNJ normalizado existe na organização:
- a publicação recebe `processId`;
- o Processo 360 passa a exibi-la na aba Publicações;
- entra um evento na timeline.

Quando não existe:
- a publicação continua salva;
- a interface informa que ainda não está vinculada;
- o usuário pode vincular manualmente a um processo do mesmo escritório.

## Revisão de prazo
Toda comunicação ativa entra como `PENDING_REVIEW`.

O sistema pode localizar datas escritas literalmente no texto. Se houver exatamente uma data explícita, ela pode preencher o campo de revisão como sugestão.

Isso não é cálculo jurídico.

Somente a ação humana `Confirmar prazo` cria um `ProcessWorkItem` de tipo `DEADLINE`.

O fluxo permanece:

```text
DJeN
-> Publication
-> DeadlineReview
-> confirmação humana
-> ProcessWorkItem
-> Agenda
-> Google Calendar, quando conectado
```

Não existe uma segunda entidade de prazo.

## Tarefas
Uma comunicação vinculada a processo também pode gerar uma tarefa.

A tarefa usa `ProcessWorkItem`, a mesma fonte já utilizada pelo Processo 360, Prazos/Tarefas e Agenda.

Se tiver data, o fluxo existente pode projetá-la no Google Calendar.

## Cancelamento na origem
Se uma comunicação ainda pendente for cancelada pelo DJeN:
- `sourceStatus` vira `CANCELLED`;
- a revisão pendente vira `SOURCE_CANCELLED`;
- a publicação continua armazenada e auditável.

Se o advogado já confirmou um prazo antes do cancelamento:
- o prazo não é removido;
- a comunicação passa a mostrar que foi cancelada na origem;
- a decisão posterior permanece humana.

## Interface
`/app/publicacoes` possui:
- Todas;
- Novas;
- Não tratadas;
- Tratadas;
- Com data expressa;
- busca;
- filtro por OAB;
- filtro por responsável;
- filtro por publicação/intimação;
- status;
- vínculo com processo;
- acesso ao detalhe.

O detalhe permite:
- vincular processo;
- revisar e confirmar prazo;
- informar que não gera prazo;
- criar tarefa;
- marcar comunicação como tratada.

## Consulta manual
Existe botão `Consultar DJeN agora` somente para desenvolvimento ou PLATFORM_MASTER.

Ele existe para validar o bloco antes do scheduler de produção. Não é uma função comercial de consulta irrestrita.

## Scheduler
A captura foi implementada como serviço reutilizável e está pronta para ser chamada por job.

Os horários definidos permanecem:
- 06:00;
- 12:00;
- 18:00.

O agendador de produção não é ativado nesta versão porque depende do ambiente de deploy. Não será criado cron público sem autenticação apropriada.

## Notificações
Captura e notificação permanecem separadas.

Nesta versão:
- publicação é capturada e persistida;
- interface interna fica disponível;
- e-mail automático ainda não é disparado;
- WhatsApp permanece futuro.

O próximo bloco de notificações deverá consumir publicações já salvas e idempotentes, sem refazer a captura.

## Planos
O módulo respeita a capability já existente `djen.monitoring`.

- Free: sem DJeN;
- Essencial e superiores: monitoramento conforme OABs permitidas pelo plano.

Nenhuma regra de preço ou limite foi recriada dentro do módulo.

## Auditoria
Eventos adicionados nesta versão incluem:
- `publication.captured`;
- `publication.source_status_updated`;
- `publication.process_linked`;
- `publication.deadline_confirmed`;
- `publication.deadline_review_dismissed`;
- `publication.task_created`;
- `publication.treated`.

## Testes
Script:

```text
npm run test:publications
```

Cobre o núcleo puro de:
- sanitização;
- localização de data literal;
- normalização DJeN;
- CNJ;
- OAB;
- variantes defensivas de consulta;
- cancelamento informado pela origem.

## Migration
`20260918010000_publications_djen`

Cria:
- `publication`;
- `publication_recipient`;
- `deadline_review`.

## Limitações desta versão
- scheduler 06/12/18 ainda precisa ser conectado no ambiente de deploy;
- e-mail automático será bloco separado;
- WhatsApp não está ativo;
- IA não participa da captura;
- nenhuma data é calculada como prazo automaticamente;
- o DJeN continua sendo serviço externo, portanto indisponibilidade da origem não deve corromper ou apagar dados locais.

## Complemento v33.1 — vínculo com identidade do processo

O vínculo automático agora funciona nos dois sentidos temporais:

1. se o processo já existe quando o DJeN captura a comunicação, o CNJ vincula imediatamente;
2. se a comunicação foi capturada primeiro e o processo é cadastrado/importado depois, a criação do processo recupera as comunicações sem vínculo com o mesmo CNJ.

Quando a própria comunicação possui um CNJ normalizado de 20 dígitos, um usuário comum não pode vinculá-la manualmente a processo de CNJ diferente. Isso evita misturar históricos processuais por engano.
