# Jurisportal Next v39.7 — Backup de documentos e banco (pré-v40)

**Base:** ZIP local v39.6 enviado pelo usuário. **Não é lançamento de produção.**

## O que entrou

- Cópia privada de PDF do R2 operacional para bucket R2 de backup, com credencial independente e prefixo por ambiente.
- Ingestão usa tentativa imediata de cópia para PDFs de até 8 MiB; maiores ficam pendentes para worker. Nunca apresentar a cópia como concluída antes da verificação SHA-256 do objeto de destino.
- O próprio registro do documento guarda `backupStatus`, tentativa, prazo de retry, hash e instante de verificação. Documentos da v39 existentes começam como PENDING e precisam de backfill.
- Worker repetível via `npm run backup:documents -- --limit=5`; endpoint `/api/cron/documents-backup` exige `CRON_SECRET` e processa um documento por requisição. Para produção há modelo de execução horária no GitHub Actions.
- Recuperação **manual** de um PDF desaparecido da origem em staging: `npm run backup:documents -- --restore=<UUID> --confirm-restore`. Não sobrescreve objeto existente, valida tamanho e hash e exige autorização explícita para produção.
- Exclusão definitiva só pode ser solicitada se `DOCUMENT_PERMANENT_DELETE_ENABLED=true` **e** a cópia desse arquivo estiver verificada. A limpeza automática não elimina um documento DELETED com backup não verificado; isso pode manter o espaço ocupado até resolver o backup.
- `database-backup.yml`: workflow de exportação do schema `public` por `pg_dump` em formato custom, valida com `pg_restore --list`, cifra com `age` usando chave pública (chave privada fora do GitHub), envia ao bucket de backup, confere ContentLength e envia SHA-256 do artefato criptografado. Executa diariamente e preserva também cópias semanais aos domingos e mensais no dia 1º. Não cria backup nativo Supabase/PITR.

## Arquitetura

```
PDF (até 50 MiB) -> R2 principal -> process_document ACTIVE
                                      | backupStatus=PENDING
                                      v
                           worker de backup / tentativa curta
                                      |
                         GET origem -> SHA-256
                                      |
                       PUT imutável no bucket de backup
                                      |
                     GET backup -> verificar SHA-256/size
                                      |
                             backupStatus=VERIFIED
```

Os documentos têm IDs aleatórios e não contêm nome/CPF no caminho. `BACKUP_PREFIX/BUCKET_PRINCIPAL/organizations/...` evita colisões entre staging/produção. A quota comercial contabiliza somente o armazenamento ativo, inclusive arquivos em recuperação de 30 dias; o armazenamento de backup é custo do Jurisportal, não quota do cliente.

## Estados e falhas

- `PENDING`: ainda não houve confirmação de cópia. Valores existentes começam aqui.
- `COPYING`: um worker tomou posse por até 15 min. Se cair, outro retenta ao expirar a posse.
- `VERIFIED`: hash SHA-256 e tamanho confirmados por leitura do objeto de backup.
- `FAILED`: código de erro sanitizado, próxima tentativa com backoff (5 min, 15 min, 1h, 3h, 12h, 24h). Criação e leitura do documento original continuam funcionando.
- A exclusão automática de arquivos DELETED com mais de 30 dias só prossegue quando a cópia foi verificada. Ainda é preciso testar a rotina de cleanup em staging.

## Variáveis locais (exemplo SEM segredos)

```
R2_BACKUP_ACCOUNT_ID=""          # pode ficar vazio se for a mesma conta R2 principal
R2_BACKUP_ACCESS_KEY_ID=""
R2_BACKUP_SECRET_ACCESS_KEY=""
R2_BACKUP_BUCKET="jurisportal-backup"
R2_BACKUP_PREFIX="staging"
R2_BACKUP_ENDPOINT=""            # opcional
BACKUP_ALLOW_PRODUCTION_RESTORE="false"
DOCUMENT_PERMANENT_DELETE_ENABLED="false"
```

Criar token R2 *Object Read & Write* restrito EXCLUSIVAMENTE ao bucket de backup. Nunca reutilizar a credencial do bucket principal. Nunca colocar secrets no git ou em `NEXT_PUBLIC_*`.

## Banco / schema

- Migration: `20260922010000_process_document_backups`. ALTER TABLE aditivo e um índice; sem tocar migrations anteriores. Revisar SQL, validar `db:status` e usar `migrate deploy` somente em ambiente de teste, após confirmação do usuário. Executar `npm run db:generate` antes do typecheck.
- A migração não realiza upload nem altera status de arquivos existentes; o worker faz o backfill depois de configurado.

## GitHub Actions — configuração quando começar a usar

Repositório privado → Settings → Secrets and variables → Actions.

Repository **secrets**:

- `BACKUP_DATABASE_URL`: conexão Supabase **direta ou session pooler**, destinada ao `pg_dump`, com `sslmode=require` e encoding correto de caracteres especiais na senha. Não usar a URL do transaction pooler.
- `R2_BACKUP_ACCOUNT_ID`: Account ID Cloudflare (do bucket de backup).
- `R2_BACKUP_ACCESS_KEY_ID`: chave S3 restrita ao bucket de backup.
- `R2_BACKUP_SECRET_ACCESS_KEY`: secret dessa chave.
- `JURISPORTAL_CRON_SECRET`: valor exatamente igual ao `CRON_SECRET` configurado no backend hospedado.

Repository **variables**:

- `BACKUP_AGE_RECIPIENT`: chave PÚBLICA `age1...`, sem colar aqui a chave privada.
- `R2_BACKUP_BUCKET`: `jurisportal-backup`.
- `R2_BACKUP_PREFIX`: `staging` ao testar; `production` ao usar dados reais (nunca confundir prefixos).
- `JURISPORTAL_BASE_URL`: URL HTTPS da aplicação hospedada, não localhost. Deixar vazio até o deploy; o workflow de documentos falhará se acionado sem a URL.

**Chave privada age:** gerar na sua máquina usando a distribuição oficial do age, guardar offline e uma segunda cópia segura. NUNCA colocar em `.env.local`, R2, GitHub, ZIP ou chat. O workflow recebe exclusivamente a chave pública para cifrar. Sem a chave privada, o dump criptografado é irrecuperável.

**Antes do primeiro push dos workflows:** configurar secrets/variables necessários ou manter os workflows desativados no GitHub Actions até a configuração. Com Free, scheduled Actions podem atrasar; verificar a aba Actions regularmente e manter cópia independente fora da Cloudflare antes de receber dados reais.

## Teste obrigatório dos PDFs

1. Criar token do bucket backup e preencher novas variáveis do `.env.local`.
2. `npm run db:validate`, `npm run db:generate`, `npm run typecheck`, `npm run build`, `npm run test:backup`, `npm run test:documents`.
3. Após migração, `npm run backup:documents -- --limit=5` até zerar pendências de staging; conferir objetos em `jurisportal-backup/staging/jurisportal-staging/...`.
4. Abrir processo e ver `Cópia de segurança verificada` no PDF fictício.
5. Com **somente arquivo fictício de staging**, apagar o objeto principal no painel Cloudflare, confirmar que seu registro ainda existe no banco, executar `npm run backup:documents -- --restore=UUID_DO_DOCUMENTO --confirm-restore` e visualizar PDF no Jurisportal.
6. Simular uma falha temporária do backup e verificar que original permanece legível e backlog é retentado.
7. Deixar `DOCUMENT_PERMANENT_DELETE_ENABLED=false` até testar também a restauração do banco.

## Teste obrigatório do PostgreSQL

1. Criar projeto Supabase de recuperação distinto, nunca restaurar sobre o banco ativo.
2. Configurar workflows após validar a chave age e `BACKUP_DATABASE_URL`; iniciar manualmente `Jurisportal - Backup criptografado do PostgreSQL` em Actions.
3. Verificar objeto `staging/database/daily/....dump.age` e `.sha256` no bucket backup; conferir resultado verde no Actions.
4. Baixar dump criptografado de TESTE, comparar SHA-256, descriptografar localmente com chave privada, rodar `pg_restore --list` e restaurar em banco isolado com PostgreSQL cliente compatível.
5. Validar contagem de clientes/processos e vínculo documento→processo em banco restaurado; recuperar um PDF fictício usando o backup R2.
6. Registrar data, RPO observado, RTO observado e hash do teste; documentar procedimento de emergência antes de v40.

**Limitações conscientes:** Não há PITR no Supabase Free; snapshot diário pode perder alterações desde a última execução. O `pg_dump --schema=public` copia dados e schema da aplicação, **não** clona configurações de painel do Supabase, segredos, R2, DNS, roles gerenciadas do fornecedor ou outros schemas da plataforma. Backups no R2 continuam na mesma Cloudflare; a cópia fora do fornecedor permanece pendência obrigatória antes de produção com clientes reais. Não foram implementadas regras automáticas de limpeza dos dumps históricos para evitar exclusão prematura: definir e testar retenção/lifecycle considerando Bucket Lock e custos antes do lançamento.
