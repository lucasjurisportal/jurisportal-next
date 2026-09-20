JURISPORTAL NEXT v35.2 - CORREÇÃO DA ORDEM DAS MIGRATIONS

Base: v35.1 Modelos + Equipe.

Correção realizada:
- A migration petition_import_pdf estava nomeada como 20260917133000_petition_import_pdf.
- Ela altera a tabela petition_generation.
- A tabela petition_generation é criada pela migration canônica 20260919010000_petition_templates.
- O Prisma reexecuta o histórico em ordem de migration no shadow database; por isso a migration de alteração era executada antes da criação da tabela e falhava com P3006/P3018 / PostgreSQL 42P01.
- A migration pendente foi renomeada para 20260919020000_petition_import_pdf.
- O SQL da migration não foi alterado.
- A migration canônica 20260919010000_petition_templates NÃO foi editada.
- Nenhuma dependência foi alterada.
- Nenhuma regra funcional de Modelos ou Equipe foi alterada.

Próxima validação local:
1. npx prisma migrate dev
2. npx prisma generate
3. npm run typecheck
4. npm run test:petition-templates
5. npm run test:team
6. npm run build
7. npm run dev

Não use npm audit fix --force.
