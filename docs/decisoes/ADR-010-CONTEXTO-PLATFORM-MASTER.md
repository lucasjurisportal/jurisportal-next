# ADR-010 — Contexto do PLATFORM_MASTER e Jurisportal Internal

## Status
Aceito — v28.3.

## Problema
O PLATFORM_MASTER pertence a duas organizações durante o desenvolvimento: o escritório criado no onboarding e `Jurisportal Internal`. O campo `session.activeOrganizationId` pertence à sessão e uma nova sessão pode nascer sem esse valor. Além disso, uma limpeza de dados de desenvolvimento pode remover o escritório de teste antigo e deixar uma sessão apontando para uma organização inexistente.

O efeito visual é perigoso: o administrador entra novamente, cai em outra organização e parece que os dados cadastrados desapareceram. Os dados não foram perdidos; apenas pertencem a outro tenant.

## Decisão
1. Uma organização explicitamente ativa e válida sempre é respeitada.
2. Se não houver organização ativa válida e o usuário for `PLATFORM_MASTER`, `Jurisportal Internal` é o workspace padrão.
3. Usuários comuns continuam usando o primeiro vínculo válido quando a sessão não informa organização ativa.
4. O comando `dev:reset-data` reposiciona sessões preservadas do PLATFORM_MASTER em `Jurisportal Internal`.
5. A área `/admin` continua separada da área `/app`.
6. A administração oferece uma ação explícita para abrir `Jurisportal Internal`; ela atualiza o contexto da sessão antes de entrar na aplicação.
7. Sair da administração redireciona para `/admin/login`, evitando confusão com o login comum.

## Segurança
`PLATFORM_MASTER` não remove o requisito de `organizationId` nos módulos jurídicos. Acesso global só pode existir em rotas administrativas explícitas e auditadas.
