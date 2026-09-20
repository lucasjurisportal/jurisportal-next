Jurisportal Next v31 — Prazos, Tarefas e Agenda integrados

Esta versão é cumulativa e parte da v30.

NOVO:
- Valor da causa manual no processo.
- Honorários percentuais calculados sobre valor da causa.
- Página global Prazos e tarefas funcional.
- Prazo/tarefa usa o mesmo registro dentro e fora do processo.
- Agenda funcional: Hoje, Semana e Mês.
- Prazos/tarefas datados aparecem automaticamente na Agenda.
- Audiências e compromissos com vínculo opcional ao processo.
- Edição simples somente para tarefa; prazo permanece protegido para fluxo auditado futuro.

NOVA TABELA:
- agenda_event

APLICAR:
1. Pare o npm run dev se estiver aberto.
2. npm run db:generate
3. npm run db:validate
4. npm run db:deploy
5. npm run typecheck
6. npm run test:work-management
7. Remove-Item -Recurse -Force .next
8. npm run dev

IMPORTANTE:
Sempre reinicie o Next após alteração de schema Prisma.
