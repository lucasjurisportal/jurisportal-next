# ADR-017 — DJeN com captura separada de notificação e revisão humana

## Status
Aceito — v33.

## Contexto
O JurisAlert já provou o acesso ao DJeN, mas foi construído como MicroSaaS de protótipo e possuía deduplicação local, consulta reduzida e envio acoplado ao fluxo de captura.

O Jurisportal Next já possui multi-tenancy, planos, processos, `ProcessWorkItem`, Agenda, auditoria e Google Calendar. Duplicar esses conceitos criaria duas fontes de verdade e aumentaria o risco jurídico e operacional.

## Decisão
Reaproveitar somente o núcleo técnico necessário do JurisAlert e adaptar ao monólito modular do Jurisportal Next.

A captura DJeN fica isolada em integração externa. Publicações são persistidas no PostgreSQL por organização. Notificações serão um consumidor separado desse dado.

## Fonte de verdade
- DJeN é a fonte externa da comunicação.
- `publication` é o registro interno normalizado e auditável.
- `deadline_review` é a etapa de revisão.
- `ProcessWorkItem` continua sendo a única fonte de verdade de prazo/tarefa operacional.

## Prazo jurídico
Nenhuma comunicação externa cria prazo definitivo automaticamente.

Uma data escrita literalmente pode ser exibida ou pré-preencher a revisão, mas só a confirmação humana cria o `ProcessWorkItem` de prazo.

## Idempotência
Uma comunicação é única por organização + fonte + chave externa.

Reexecutar a mesma janela não pode duplicar publicação.

## Cancelamento
Cancelamento informado pelo DJeN não apaga histórico.

Se a revisão ainda está pendente, ela deixa de exigir confirmação e recebe estado `SOURCE_CANCELLED`.

Se um prazo já foi confirmado por usuário, ele não é excluído ou alterado silenciosamente. A origem cancelada fica visível para revisão humana.

## Segurança
- `organizationId` obrigatório;
- RLS habilitado nas novas tabelas;
- processo só é localizado dentro da própria organização;
- conteúdo HTML externo vira texto puro antes de persistir/exibir;
- consulta manual fica restrita a desenvolvimento ou PLATFORM_MASTER;
- nenhum segredo novo é necessário para consultar a API pública nesta versão.

## Scheduler
O serviço de captura deve ser chamado em 06h, 12h e 18h no ambiente de produção.

A infraestrutura de cron será conectada no deploy com autenticação própria. Não será criada rota pública sem proteção apenas para antecipar o scheduler.

## Consequências
### Positivas
- reaproveita código já testado conceitualmente no JurisAlert;
- mantém uma única fonte de prazos;
- preserva multi-tenancy e auditoria;
- permite reprocessamento seguro;
- permite e-mail e WhatsApp evoluírem sem acoplamento à captura.

### Custos
- há uma etapa explícita de revisão humana;
- notificações e scheduler de produção são blocos separados;
- indisponibilidade do DJeN precisa ser tratada como falha externa, não como falha de domínio.
