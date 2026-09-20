# ADR-021: Equipe sem cross-account

## Decisão
Usuários auxiliares criados por um proprietário pertencem exclusivamente à organização que os criou. Enquanto esta decisão estiver vigente, e-mail já cadastrado no Jurisportal não pode ser usado para criar auxiliar em outro escritório.

## Razão
Evitar que a infraestrutura global de autenticação do Better Auth seja interpretada como conta compartilhável entre tenants. Compartilhamento entre contas será um projeto separado e não faz parte do módulo Equipe atual.

## Consequências
`User` continua sendo a entidade técnica de autenticação, `Member` mantém o vínculo com a organização e `TeamMemberProfile` guarda regras operacionais de equipe e primeiro acesso. A remoção encerra membership/sessões sem apagar o usuário histórico.
