# Jurisportal Next

Reconstrução moderna do Jurisportal em Next.js + TypeScript.

O projeto está entrando na fase funcional. O HTML autocontido continua existindo como referência visual, mas a produção deve seguir a arquitetura modular em `src/`.

## Leia nesta ordem

1. `START-HERE.md`
2. `docs/PADROES-DO-PROJETO.md`
3. `docs/arquitetura/ARQUITETURA-ALVO.md`
4. `docs/produto/PLANOS-E-CAPABILITIES-v1.md`
5. documentação do módulo que será alterado

## Regra principal

Nenhuma tela é fonte de verdade para regra comercial ou jurídica.

Preço e capabilities: `src/modules/plans/`

Política interna de IA: `src/modules/ai/`

## Estado atual

O projeto já está em fase funcional avançada. Autenticação, segurança, Clientes, Processos, Processo 360, Prazos e Tarefas, Agenda, Google Calendar, Publicações/DJeN, Modelos de Petições, Equipe, Relatórios e Configurações estão implementados em módulos reais.

A v38 fecha o acabamento anterior a Plano e Cobrança: Central de ajuda, tutoriais contextuais, notificações no topo, Meu perfil, suporte e Dashboard com dados reais. O HTML autocontido permanece apenas como referência visual.
## Banco de desenvolvimento

A fundação de banco está preparada para Supabase + PostgreSQL + Prisma.
Não execute migrations antes de confirmar a conectividade em `/api/health/database`.
Veja `docs/blocos/14-banco-supabase-prisma.md`.


## Estado funcional v27
A autenticação básica já está funcional. A v27 adiciona confirmação de e-mail, 2FA, recuperação, dispositivo confiável de 15 dias e conta mestre da plataforma.

Variáveis locais necessárias:
- `DATABASE_URL` / `DIRECT_URL`
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
- `RESEND_API_KEY`
- opcional `RESEND_FROM`

Leia `docs/blocos/17-seguranca-2fa-e-admin.md` antes de alterar autenticação.

## Estado funcional v28
O primeiro domínio jurídico persistente é **Clientes**.

Inclui PF/PJ, validação de CPF/CNPJ, busca, filtros, paginação de 10, CEP auxiliar, edição, arquivamento lógico, auditoria, limites por plano e isolamento por `organizationId`.

Leia `docs/blocos/18-clientes-funcional.md` e `docs/decisoes/ADR-009-CLIENTES-UNIFICADOS-E-ARQUIVAMENTO.md`.

## Estado funcional v29
O domínio **Processos** agora é persistente e conectado a Clientes.

Planos pagos possuem clientes ilimitados, enquanto processos são controlados por capacidade comercial. Arquivar ou encerrar não libera a vaga automaticamente.

Leia `docs/blocos/21-processos-funcional.md`, `docs/arquitetura/DOMINIO-PROCESSOS.md` e `docs/decisoes/ADR-010-LIMITE-DE-PROCESSOS-E-RETENCAO.md`.

## Estado funcional v30
A página interna do processo virou workspace operacional: linha do tempo, prazos/tarefas, financeiro jurídico e auditoria reais.

## Estado funcional v31
Prazos e Tarefas agora possuem visão global e usam a mesma entidade existente dentro do processo. A Agenda funcional projeta automaticamente itens datados e adiciona audiências/compromissos em `agenda_event`.

O processo também passou a armazenar `caseValue` (valor da causa). Contratos percentuais podem calcular honorários sobre esse valor sem alterar silenciosamente o valor histórico contratado.

Leia:
- `docs/blocos/23-prazos-tarefas-agenda-funcional.md`
- `docs/decisoes/ADR-013-FONTE-UNICA-PRAZOS-AGENDA.md`
- `docs/decisoes/ADR-014-VALOR-DA-CAUSA-E-HONORARIOS.md`

## Estado funcional v32
A Agenda pode ser conectada individualmente ao Google Calendar por OAuth 2.0. O escopo utilizado é `calendar.events.owned` e os tokens são cifrados antes de serem persistidos.

A sincronização inicial é unidirecional: Jurisportal -> Google. Alterações feitas diretamente no Google não alteram prazo jurídico no Jurisportal.

Leia:
- `docs/blocos/24-google-calendar-funcional.md`
- `docs/decisoes/ADR-016-GOOGLE-CALENDAR-UNIDIRECIONAL.md`
## Estado funcional v33
Publicações e Intimações agora possuem persistência real a partir do DJeN. O núcleo técnico do JurisAlert foi reaproveitado sem incorporar sua aplicação inteira.

Comunicações são deduplicadas por organização, vinculadas automaticamente ao processo quando o CNJ já existe e entram em revisão humana antes de qualquer prazo definitivo. Prazos e tarefas gerados continuam usando `ProcessWorkItem`.

Leia:
- `docs/blocos/25-publicacoes-djen-funcional.md`
- `docs/decisoes/ADR-017-DJEN-CAPTURA-E-REVISAO-HUMANA.md`


## Estado funcional v33.1
A identidade de cada processo agora separa o número CNJ oficial da referência interna anual do escritório. O CNJ é confirmado no cadastro e fica bloqueado para usuários normais; correções administrativas controladas exigem motivo e auditoria.

Publicações capturadas antes do cadastro do processo também são recuperadas automaticamente quando um processo com o mesmo CNJ entra no escritório.

As quotas de armazenamento por plano já fazem parte do catálogo comercial para o próximo bloco de Documentos e Migração.

Leia:
- `docs/blocos/26-identidade-processo-e-migracao-preparada.md`
- `docs/decisoes/ADR-018-IDENTIDADE-CNJ-E-REFERENCIA-INTERNA.md`
- `docs/decisoes/ADR-019-ARMAZENAMENTO-POR-PLANO-E-MIGRACAO.md`

## Estado funcional v34
Modelos de Petições agora possuem biblioteca funcional. O sistema separa modelos-base do Jurisportal de modelos próprios do escritório, mantém histórico de versões, resolve variáveis no backend e registra o conteúdo efetivamente gerado com a versão utilizada.

A interface de auditoria também deixa de expor códigos internos em inglês e passa a apresentar rótulos em pt-BR, preservando os identificadores técnicos no banco.

Leia:
- `docs/blocos/27-modelos-peticoes-funcional.md`
- `docs/decisoes/ADR-020-MODELOS-PETICOES-VERSIONADOS.md`
- `docs/produto/STATUS-DE-PRODUCAO-v34.md`
- `docs/arquitetura/FUTURO-PROTOCOLO-JUDICIAL.md`

## Estado funcional v36

A central de **Relatórios** passa a usar dados reais do tenant, com filtros por período, visão operacional e financeira, detalhamento de processos, prazos/tarefas, publicações, financeiro e atividade interna da equipe quando permitida pelo plano.

Relatórios básicos começam no Essencial. Relatórios avançados começam no Premium. Atividade da equipe continua restrita ao proprietário e ao capability `team.activity`.

Exportações CSV são auditadas e protegidas contra CSV Formula Injection. A impressão pode ser salva como PDF sem armazenar o arquivo no PostgreSQL.

Leia `docs/blocos/relatorios.md` e `docs/decisoes/ADR-0012-relatorios-sem-snapshot.md`.


## Estado funcional v38
A experiência principal foi ligada aos dados reais antes do bloco de Plano e Cobrança. O Dashboard não usa mais números de demonstração, o sino mostra avisos derivados dos módulos existentes e a Central de ajuda mantém os tutoriais do sistema.

Leia `docs/blocos/31-acabamento-ajuda-notificacoes-dashboard.md` e `docs/decisoes/ADR-025-UX-AJUDA-NOTIFICACOES-DASHBOARD.md`.

## v40 — Consolidação Documentos, Petições e Backup (staging)

Leia `docs/blocos/40-consolidacao-documentos-peticoes-backup.md` antes de configurar armazenamento, recuperação ou novas integrações. O documento registra o estado real, operação, backups às 01h/01h30 (São Paulo), reconciliação auditada de PDF de teste ausente e riscos pendentes de recuperação integral/produção. A v40 é um **marco de documentação e correção pontual de staging**, não homologação de produção, IA, comunicação ou cobrança.
