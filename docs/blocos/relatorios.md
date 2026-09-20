# Bloco — Relatórios do proprietário

## Objetivo

Entregar ao proprietário do escritório uma central de gestão baseada exclusivamente em dados reais já persistidos no Jurisportal e usar a mesma fonte para o relatório diário enviado ao e-mail principal da conta.

Não existe uma segunda base analítica nesta fase. O relatório consulta as tabelas operacionais e `AuditEvent`.

## Acesso

Rotas principais:

- `/app/relatorios`
- `/api/reports/export`
- `/api/cron/daily-owner-report`

Regras:

- somente `Member.role === owner` acessa a central de Relatórios;
- Nível 1 e Nível 2 não visualizam o item Relatórios no menu;
- acesso direto à rota por funcionário redireciona para o Dashboard;
- exportação CSV também exige `owner` no backend;
- o proprietário continua fora dos indicadores de produtividade, embora suas ações críticas permaneçam auditadas nos módulos normais.

## Capacidades comerciais

- `reports.basic`: Essencial em diante;
- `reports.advanced`: Premium em diante;
- `team.activity`: necessário para exibir jornada e atividade de funcionários;
- Free continua sem central de relatórios.

A permissão comercial não substitui a regra de propriedade. Ter `reports.basic` não libera Relatórios para funcionário.

## Filtros

A central permite:

- mês atual;
- últimos 30 dias;
- últimos 90 dias;
- ano atual;
- intervalo personalizado;
- usuário específico.

O filtro por usuário respeita a relação existente em cada domínio:

- clientes: criador;
- processos: responsável;
- prazos/tarefas: responsável;
- publicações: usuário que leu ou tratou;
- financeiro: criador do lançamento;
- atividade/auditoria: ator do evento.

O seletor pode mostrar o proprietário, integrantes ativos e integrantes removidos preservados no histórico. Selecionar o proprietário não o transforma em alvo de produtividade; a seção Jornada da equipe fica sem sessões dele.

## Conteúdo operacional

A central apresenta:

- clientes ativos e clientes cadastrados no período;
- processos ativos, total e novos processos;
- prazos/tarefas abertos, atrasados, concluídos e com vencimento no período;
- publicações/intimações e itens não tratados;
- revisões de prazo pendentes;
- honorários recebidos;
- custos pagos;
- honorários pendentes;
- tabelas detalhadas de processos, prazos/tarefas, publicações e financeiro.

A UX prioriza números, listas e tabelas. Não foram adicionados gráficos artificiais.

## Jornada e atividade da equipe

### Sessão de funcionário

Quando um funcionário entra no ambiente protegido do Jurisportal, o `ActivityGuard` chama `/api/team/session/start`.

O endpoint é idempotente por `sessionId` e cria em `AuditEvent`:

- `team.session.started`;
- `entityType = auth_session`;
- `entityId = Session.id`.

O proprietário/administrador não possui `TeamMemberProfile`, portanto não é registrado como sessão produtiva.

### Encerramento

São registrados:

- logout manual: `reason = manual`;
- logout automático por 30 minutos de inatividade do funcionário: `reason = inactivity`;
- remoção do funcionário pelo proprietário: `reason = removed_by_owner`.

O encerramento usa `team.session.ended` e o mesmo `Session.id`.

### Navegador fechado

Fechar navegador, encerrar o processo do computador ou perder rede não garante evento de logout confiável. Nesses casos o Jurisportal não inventa uma saída.

O relatório mostra:

- hora de entrada;
- saída quando existe evento explícito;
- última atividade conhecida pelo heartbeat;
- duração baseada em saída explícita ou última atividade conhecida;
- motivo de encerramento quando disponível.

### Inatividade

Permanece a política definida:

- funcionário: após 10 minutos sem interação deixa de gerar presença ativa;
- funcionário: logout aos 30 minutos;
- proprietário/administrador: fora de produtividade, logout de segurança após 1 hora com aviso.

Somente atividade dentro do Jurisportal é observada.

## Relatório diário por e-mail

O relatório diário usa `getReportData()`, a mesma fonte da tela.

Destinatário atual:

- e-mail do `Member` com papel `owner`, tratado como e-mail principal/contratante enquanto o módulo de cobrança ainda não possui um campo separado de pagador.

Conteúdo:

- resumo operacional;
- financeiro do dia;
- entrada/saída/última atividade dos funcionários;
- processos cadastrados;
- prazos e tarefas;
- atividade auditável recente;
- link para o relatório completo do dia.

Agendamento preparado:

- 20:00 `America/Sao_Paulo`;
- `vercel.json` dispara a rota às 23:00 UTC;
- a rota exige `Authorization: Bearer $CRON_SECRET`;
- o envio usa o mesmo Resend já empregado pelo projeto;
- `report.daily_email_sent` impede retry normal de reenviar o mesmo dia;
- falhas são registradas como `report.daily_email_failed`.

Se o deploy não usar Vercel Cron, outro scheduler pode chamar a mesma rota protegida sem alterar a regra de negócio.

## Exportação

Cada tabela pode ser exportada em CSV com até 5.000 linhas por relatório.

Regras:

- UTF-8 com BOM;
- separador `;`;
- proteção contra CSV Formula Injection;
- exportação auditada em `report.csv_exported`;
- `organizationId` obrigatório;
- filtro de usuário propagado para exportação;
- somente proprietário.

A página oferece `Imprimir / salvar PDF` usando a impressão do navegador, sem blob no PostgreSQL.

## Banco

Este refinamento não cria tabela, coluna ou migration.

Dados utilizados incluem:

- `member`;
- `team_member_profile`;
- `session`;
- `audit_event`;
- `client`;
- `process`;
- `process_work_item`;
- `process_finance_entry`;
- `publication`;
- `deadline_review`;
- `user`.

## Segurança

- autenticação e 2FA passam por `getAppContext()`;
- tenant sempre filtrado por `organizationId`;
- Relatórios exigem proprietário no servidor;
- `CRON_SECRET` protege o disparo automático;
- o e-mail contém apenas dados do próprio tenant;
- nenhuma telemetria externa ao Jurisportal é coletada.

## Testes locais

```powershell
npm run typecheck
npm run test:reports
npm run test:team
npm run build
npm run dev
```

Depois validar manualmente:

1. funcionário não vê Relatórios e não abre `/app/relatorios`;
2. proprietário abre Relatórios;
3. filtro por usuário altera os dados;
4. funcionário entra e aparece uma sessão iniciada;
5. logout manual registra saída;
6. relatório mostra entrada, saída e última atividade;
7. exportação continua restrita ao proprietário;
8. rota de cron sem segredo retorna 401/503 conforme configuração.
