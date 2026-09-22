# v39.7.1 — Backup automático dos documentos às 01:00 (staging)

## O que foi corrigido

O `SOURCE_PDF_MISSING` NÃO significa que o backup funcionou: indica um registro de PDF no PostgreSQL para o qual o objeto não foi encontrado no R2 principal, segundo o bucket/chave configurados. O teste retornou `verified: 0` e `failed: 1`.

Esta atualização substitui o workflow de documentos, que anteriormente tentava chamar uma URL HTTPS hospedada a cada hora. Agora **executa o script de backup diretamente no GitHub Actions**, mesmo antes de existir deploy na Vercel ou de seu PC estar ligado, todos os dias às 01:00 (America/Sao_Paulo), com possibilidade de execução manual.

O script executa até **200 PDFs por rodada**, em lotes de 10. Se houver PDFs faltantes, falha de cópia ou arquivos ainda pendentes, a execução termina em vermelho: nunca afirma que protegeu arquivos que não protegeu. Uma falha não impede que outros documentos elegíveis sejam copiados.

**Importante:** o agendamento do GitHub pode atrasar ou falhar ocasionalmente; a meta é execução diária na janela de 01:00, não garantia de início no segundo exato. Antes de produção real, acrescentar alerta de ausência de backup, retenção e cópia fora da Cloudflare.

## Aplicação

Extrair este ZIP por cima da v39.7 instalada. Altera apenas:

- `.github/workflows/documents-backup-check.yml`
- `scripts/backup/documents.ts`

Sem migration e sem dependências novas. Validar com:

```powershell
npm run typecheck
npm run test:backup
```

## Configurar GitHub Actions (não colar credenciais no chat)

GitHub → repositório privado → **Settings → Secrets and variables → Actions → New repository secret**.

Criar 6 segredos, usando apenas os valores de **staging**:

| Nome EXATO | Valor |
|---|---|
| `STAGING_DATABASE_URL` | `DATABASE_URL` do Supabase de testes, igual ao .env.local; NUNCA a URL da produção |
| `STAGING_R2_ACCOUNT_ID` | Account ID do R2 de testes |
| `STAGING_R2_ACCESS_KEY_ID` | Access Key ID do token restrito a jurisportal-staging |
| `STAGING_R2_SECRET_ACCESS_KEY` | Secret Access Key desse token |
| `STAGING_R2_BACKUP_ACCESS_KEY_ID` | Access Key ID do token restrito a jurisportal-backup |
| `STAGING_R2_BACKUP_SECRET_ACCESS_KEY` | Secret Access Key desse token |

**Não alterar `.env.local` nem copiar suas credenciais para arquivos versionados.** O `R2_BACKUP_PREFIX` está fixado em `staging` nesse workflow, assim como os buckets, para reduzir risco de misturar ambientes. Se os nomes dos buckets diferirem, não rode o workflow até revisar o arquivo.

Depois da configuração, faça `git add .github/workflows/documents-backup-check.yml scripts/backup/documents.ts` + commit + push. Na aba **Actions** escolha **Jurisportal - Backup diario PDFs (staging)** e **Run workflow** para o primeiro teste manual. O agendamento diário começará nas execuções seguintes. Confira se mostra `verified > 0` para um arquivo novo e que `failed=0` quando todas as pendências forem resolvidas.

## Investigar o documento faltante

No terminal, o ID encontrado foi `d9ae7b91-af5d-452b-9430-0fb37ca9350b`. Abra `npm run db:studio` → tabela `process_document` → localize esse ID; confira `status`, `storageKey`, `backupStatus`, `backupLastError`, `processId` e `organizationId`, sem editar. No Cloudflare, confira se o objeto correspondente existe no bucket que está em `R2_BUCKET` no `.env.local`. Se estiver no backup, NÃO apague nem altere os registros: talvez seja caso de restauração. Se estiver `DELETED`, ainda pode contar na quota por 30 dias. Se estiver `ACTIVE`, pode representar perda de arquivo ou bucket incorreto. Não executar reset nem exclusões em massa.

Crie um novo PDF **fictício** e envie ao staging para testar a cópia. Um PDF pequeno pode ter backup imediato na v39.7; o teste do job noturno processará o que estiver pendente. Antes de registrar backup como concluído, precisamos ver pelo menos um `VERIFIED` real e resolver o objeto faltante.

## Banco de dados

O backup criptografado do PostgreSQL tem **outro workflow** (`.github/workflows/database-backup.yml`); este patch não altera seu agendamento ou habilita suas credenciais. Ainda faltam criar chave age, configurar `BACKUP_DATABASE_URL` e comprovar uma restauração em banco isolado antes de v40.
