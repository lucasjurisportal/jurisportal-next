JURISPORTAL NEXT v35.1 - CORREÇÃO DE EQUIPE: OAB + INATIVIDADE

Base: v35 gerada diretamente sobre a v34 canônica.
Esta revisão corrige as regras de Equipe antes de promover v35 como base canônica.

Correções desta revisão:
- OAB e UF agora são obrigatórias para todo auxiliar
- cada auxiliar consome 1 vaga de usuário e 1 vaga de OAB
- backend valida plan.users e plan.oabs
- OAB é normalizada e duplicidade no escritório é bloqueada
- OAB do auxiliar não possui edição direta nesta fase
- remoção do auxiliar desativa sua OAB, libera a cota ativa e preserva histórico
- TeamMemberProfile exige OAB no banco
- RLS habilitado para team_member_profile
- funcionários: atividade até 10 min e logout em 30 min
- proprietário/admin: sem indicador de produtividade, aviso após 1h sem uso e logout por segurança
- inatividade sincronizada entre abas do Jurisportal
- login informa o motivo do logout por inatividade
- novo teste unitário da política de inatividade

Modelos de Petições da v35 permanecem inalterados nesta revisão.

Validação local obrigatória:
1. npm install
2. npx prisma generate
3. npx prisma migrate dev
4. npm run typecheck
5. npm run test:petition-templates
6. npm run test:team
7. npm run build
8. npm run dev

Não executar npm audit fix --force.
