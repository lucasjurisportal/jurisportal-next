Jurisportal Next v29.1 - correção de tipagem da listagem de Processos

Problema corrigido:
- `listInclude` estava declarado com `as const`, tornando `orderBy` um array readonly.
- O Prisma espera um array mutável no tipo `ProcessInclude`.
- Isso impedia o TypeScript de inferir as relações `clients` e `responsible` no retorno de `findMany`.

Correção:
- `listInclude` agora usa `satisfies Prisma.ProcessInclude`.
- Removidos os `as const` do `orderBy`.
- Nenhuma alteração de banco, migration ou regra de negócio.

Aplicação:
1. Substitua src/modules/processes/application/process-service.ts
2. Rode: npm run typecheck
3. Se passar: npm run test:processes
4. Depois: npm run dev
