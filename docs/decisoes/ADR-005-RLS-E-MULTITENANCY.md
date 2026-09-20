# ADR-005 - RLS e isolamento multi-tenant

## Status
Aceito para a fundação do Jurisportal Next.

## Problema
O Jurisportal é multi-tenant: vários escritórios compartilham o mesmo PostgreSQL. Um erro de consulta nunca pode expor dados de um escritório para outro.

## Decisão
O isolamento será feito em camadas:

1. Toda entidade de negócio que pertença a um escritório terá `organizationId` obrigatório.
2. A camada de aplicação sempre resolverá a organização ativa a partir da sessão autenticada. O navegador nunca será fonte de verdade para escolher livremente um `organizationId` em operações sensíveis.
3. Repositórios e serviços de domínio receberão o contexto da organização explicitamente.
4. PostgreSQL RLS será usado como defesa adicional nas tabelas de tenant.
5. A conexão administrativa usada para migrations não deve ser confundida com a conexão de aplicação.

## Limitação importante desta fase
O usuário administrativo `postgres` do Supabase pode ignorar RLS. Portanto, simplesmente ligar RLS não torna uma aplicação segura se o backend fizer consultas sem autorização correta.

Antes de dados reais de clientes entrarem no sistema, a conexão de runtime será revisada para princípio de menor privilégio e as políticas RLS serão testadas com dois escritórios distintos.

## Regra de teste obrigatória
Todo módulo multi-tenant deverá possuir pelo menos um teste negativo: usuário do Escritório A tenta consultar/alterar registro do Escritório B e recebe negação.

## Consequência
Nenhum programador deve remover `organizationId`, filtros de tenant ou políticas RLS para "simplificar" consultas.
