JURISPORTAL NEXT v29 — PROCESSOS FUNCIONAL

Esta é uma versão cumulativa completa, baseada nas correções v27.1, v28.1, v28.2, v28.3 e v28.4.
Não é um patch baseado em versão antiga.

Aplicação:
1. Preserve seu .env.local.
2. Extraia/copiei esta versão sobre C:\Users\Pichau\Desktop\Projeto Jurisportal Next.
3. Rode npm run db:generate
4. Rode npm run db:validate
5. Rode npm run db:deploy
6. Rode npm run typecheck
7. Rode npm run test:processes
8. Rode npm run dev
9. Abra http://localhost:3000/app/processos

Mudanças principais:
- clientes ilimitados nos planos pagos;
- processos limitados em 10/100/250/500/1000/2000;
- processo real no PostgreSQL;
- cliente principal e múltiplos clientes por processo;
- partes, responsável, status e linha do tempo;
- bloqueio de exclusão permanente de cliente com processo vinculado;
- uso real de processos exibido na lateral;
- documentação e migration do domínio Processos.
