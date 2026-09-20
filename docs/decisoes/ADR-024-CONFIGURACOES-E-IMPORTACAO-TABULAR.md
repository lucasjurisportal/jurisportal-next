# ADR-024 — Configurações e importação tabular sem bypass de domínio

## Status

Aceita na v37.

## Contexto

O escritório precisa configurar conta/escritório e trazer dados de sistemas anteriores sem recadastrar manualmente centenas de registros. Ao mesmo tempo, uma importação direta via SQL ou inserts específicos criaria um segundo conjunto de regras para Clientes e Processos, com risco de ignorar limites comerciais, CNJ, tenant, auditoria e vínculos jurídicos.

## Decisão

1. Configurações reaproveitam tabelas existentes; preferências leves ficam em `Organization.metadata` versionado.
2. Importação inicial aceita CSV/XLSX e é exclusiva do proprietário.
3. O arquivo passa por mapeamento + dry-run obrigatório antes da confirmação.
4. A confirmação revalida o arquivo e chama `createClient()` ou `createProcess()`.
5. `organizationId` é sempre derivado da sessão.
6. Processos são vinculados a clientes por CPF/CNPJ e a responsáveis por e-mail da equipe.
7. Referência interna é sempre gerada pelo Jurisportal.
8. A origem persistida/auditada é `IMPORT`.
9. O arquivo original não é armazenado no PostgreSQL.
10. A primeira versão síncrona limita arquivos a 4 MB e 1.000 linhas.

## Consequências positivas

- uma única fonte de regras para cadastro manual e importado;
- evita drift entre módulos;
- prévia mostra problemas antes de gravar;
- migração respeita plano e isolamento multi-tenant;
- não exige migration nova;
- futura fila assíncrona pode reutilizar o mesmo domínio.

## Trade-offs

- arquivos maiores precisam ser divididos;
- cliente precisa existir antes do processo;
- `.xls` legado fica fora da primeira versão;
- não existe retomada de importação interrompida, pois não há staging persistente nesta etapa.

## Futuro

Para migrações grandes, criar o Assistente de Migração completo com staging temporário persistente, jobs idempotentes, dry-run salvo, relatório de inconsistências e importação de documentos, sem alterar as regras de domínio descritas aqui.
