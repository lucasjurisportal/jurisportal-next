# ADR-004 — PostgreSQL no Supabase com Prisma

## Status
Aceita.

## Decisão
O Jurisportal Next utilizará PostgreSQL hospedado no Supabase e Prisma ORM como camada principal de acesso ao banco no backend.

- `DATABASE_URL`: conexão pooled/Transaction Pooler usada pela aplicação em runtime.
- `DIRECT_URL`: conexão Session Pooler/direta usada pelo Prisma CLI para schema e migrations.
- Segredos ficam em `.env.local` no desenvolvimento e nunca entram no Git.
- O frontend não acessa o banco diretamente. Regras de negócio passam pelo backend/módulos.
- O modelo é multi-tenant desde a fundação: cada escritório é uma `Organization`.

## Motivo
Queremos PostgreSQL gerenciado na nuvem sem depender da máquina do proprietário, com migrations reproduzíveis e acesso tipado no TypeScript.

## RLS
RLS continua como defesa adicional contra acessos pela Data API do Supabase. Nesta fase, o backend Prisma utiliza credencial de banco privilegiada e, portanto, o isolamento de tenant também deve ser imposto obrigatoriamente pela camada de aplicação. Uma etapa posterior adicionará políticas explícitas e uma estratégia de role não privilegiada para defesa em profundidade.

## Consequências
- Nenhuma tabela deve ser criada manualmente pelo painel do Supabase.
- Toda alteração de estrutura deve gerar migration versionada.
- Nenhum módulo pode executar consultas multi-tenant sem `organizationId`, exceto rotinas administrativas explicitamente documentadas.
