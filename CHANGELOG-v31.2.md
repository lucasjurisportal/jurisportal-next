# v31.2 — Compatibilidade Prisma/pg

- `pg` fixado em 8.17.2 para evitar o `DeprecationWarning` introduzido em `pg` 8.19+ enquanto o problema do `@prisma/adapter-pg` permanecer aberto.
- Nenhuma alteração de schema, migration ou regra de negócio.
- Adicionado ADR-015 documentando a decisão e a condição para futura atualização.
