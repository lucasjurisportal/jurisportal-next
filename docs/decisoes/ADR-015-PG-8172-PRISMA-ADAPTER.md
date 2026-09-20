# ADR-015 — Fixar `pg` 8.17.2 enquanto o `@prisma/adapter-pg` emitir aviso de concorrência

## Contexto

Durante a v31, o ambiente de desenvolvimento passou a exibir:

`DeprecationWarning: Calling client.query() when the client is already executing a query...`

O aviso passou a ser emitido pelo `pg` a partir da linha 8.19.x e existe um problema aberto no `@prisma/adapter-pg` em que a implementação interna do adaptador pode disparar o aviso mesmo em consultas simples. O comportamento ainda funciona no `pg` 8.x, mas o aviso antecipa uma incompatibilidade futura com `pg` 9.

## Decisão

Fixar temporariamente a dependência de runtime:

`pg = 8.17.2`

Não atualizar `pg` para 8.19+ ou 9.x sem antes executar a suíte de testes e confirmar que a versão corrente do Prisma corrigiu o problema no adaptador.

## Consequências

- o overlay de desenvolvimento deixa de ser poluído por esse aviso;
- não alteramos schema, migrations nem dados;
- continuamos usando Prisma 7.10.0 e Supabase/PostgreSQL normalmente;
- esta fixação é um workaround de compatibilidade, não uma regra eterna;
- futuras atualizações de Prisma devem revisar esta ADR.
