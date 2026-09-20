JURISPORTAL NEXT v35 - MODELOS DE PETIÇÕES + EQUIPE

Base: v34 canônica. Nenhum rascunho anterior de v35 foi utilizado.

Bloco A concluído:
- importação DOCX/TXT para conteúdo editável
- revisão antes de salvar
- versionamento preservado
- edição do documento gerado
- PDF A4 sob demanda
- auditoria com hash do conteúdo exportado
- sem blob PDF no PostgreSQL

Bloco B concluído:
- proprietário cria auxiliar com senha provisória
- limites de usuários e OABs por plano
- OAB obrigatória para todo auxiliar
- vínculo exclusivo ao escritório nesta fase
- troca obrigatória de senha no primeiro login
- Nível 2 / Nível 1 sem role admin do Better Auth
- remoção direta sem apagar autoria histórica
- sessões encerradas na remoção
- funcionário: 10 min para atividade e 30 min para logout
- proprietário/admin: aviso e logout após 1h sem uso
- documentação e migrations incluídas

Antes de iniciar após substituir os arquivos:
1. npm install
2. npx prisma generate
3. npx prisma migrate dev
4. npm run typecheck
5. npm run test:petition-templates
6. npm run test:team
7. npm run build
8. npm run dev
