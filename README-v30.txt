Jurisportal Next v30 — Processo 360 operacional

Esta versão é cumulativa e parte da v29.2.

NOVO BANCO:
- process_work_item
- process_fee_agreement
- process_finance_entry

APLICAR:
1. npm run db:generate
2. npm run db:validate
3. npm run db:deploy
4. npm run typecheck
5. npm run test:process-workspace
6. npm run dev

TESTAR:
- Abrir um processo existente.
- Criar evento manual na Linha do tempo.
- Criar tarefa e prazo, concluir e reabrir.
- Configurar contrato de honorários.
- Criar lançamento financeiro.
- Conferir Histórico.

Publicações/DJeN e Documentos ainda não estão ativos nesta versão.
