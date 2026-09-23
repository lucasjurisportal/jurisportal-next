# Jurisportal Next v40 — Consolidação técnica: Documentos, Modelos de Petições e Backup

**Base examinada:** ZIP local `Projeto Jurisportal Next(2).zip`, recebido após os testes de PDF e PostgreSQL em staging, em setembro de 2026. Este documento descreve a implementação encontrada no código e diferencia expressamente testes relatados pelo proprietário de validações que ainda precisam ser feitas em produção.

**Versão v40 = marco documental e correção pontual do backup em staging; NÃO é liberação para produção comercial.** A landing pública continua para a última fase, baseada no que realmente estará disponível. As versões anteriores permanecem em `docs/blocos/32-*` a `39b-*`.

## 1. Desenho do produto e responsabilidades

- Next.js 16 / App Router, TypeScript, PostgreSQL gerenciado no Supabase, Prisma 7 com adaptador `pg`; `organizationId` determina a organização ativa em operações multi-tenant.
- Cloudflare R2 privado é o repositório de bytes dos documentos PDF. PostgreSQL guarda metadados e vínculo por escritório/processo. O banco não contém os PDFs.
- `src/modules/documents/`: armazenamento, quota, recuperação, estados e cópia R2.
- `src/modules/petition-templates/`: modelos oficiais/próprios, versões, variáveis, rascunhos e PDFs A4.
- `src/app/api/processes/[id]/documents/`: APIs com sessão, organização e processo. `src/components/documents/ProcessDocuments.tsx`: interface.
- `.github/workflows/documents-backup-check.yml`: backup diário dos PDFs. `.github/workflows/database-backup.yml`: `pg_dump` criptografado.
- Outras áreas já têm código e telas (Clientes, Processos, Equipe, Agenda/Google Calendar, Publicações/DJeN, Configurações, Relatórios). Isso NÃO implica que a captura nacional contínua, faturamento ou todas as políticas de segurança estejam homologadas.

## 2. Documentos: o que existe

| Recurso | Situação no código |
|---|---|
| PDF individual | Upload direto por URL temporária SigV4, limite nominal de 50 MiB por arquivo, HEAD/Range para assinatura `%PDF-` e conferência de bytes. |
| ZIP | Extração apenas de PDFs, bloqueio de traversal e máximo de 200 documentos; download em lote limitado a 200 MB. |
| Acesso | `organizationId` e `processId` são verificados na API; URLs GET temporárias; visualizar e baixar arquivos ativos. |
| Quota | `organization_storage_usage`, reserva/conclusão transacionais com lock por organização; documentos excluídos ainda ocupam quota. |
| Exclusão | `ACTIVE` → `DELETED`, recuperação por 30 dias; eliminação permanente desligada por padrão. Limpeza só alcança DELETED depois de 30 dias **se VERIFIED**. |
| Backup | Cópia R2 em bucket distinto, confirmação por tamanho e SHA-256; status por documento e retries; backup imediato para PDFs até 8 MiB, rotina diária para os demais. |
| Restauração do PDF | Comando manual por UUID; exige backup VERIFIED, confere hash, não sobrescreve o original existente. |

Arquivos de referência: `src/modules/documents/application/document-service.ts`, `document-backup-service.ts`, `src/modules/documents/infrastructure/r2-storage.ts` e `prisma/migrations/20260922010000_process_document_backups/migration.sql`.

### 2.1 Significado dos estados de backup

| Estado | Interpretação |
|---|---|
| `PENDING` | Ainda sem confirmação de backup. |
| `COPYING` | Tentativa sob lease; uma interrupção permite retry. |
| `FAILED` | Cópia não validada, com motivo e próxima tentativa. O job deve sinalizar falha. |
| `VERIFIED` | Cópia conferida por tamanho e SHA-256 no momento da operação. Não garante verificações perpétuas. |
| `ACKNOWLEDGED_MISSING` | **Somente staging**, DELETED, origem e backup comprovadamente ausentes e perda reconhecida manualmente. **Não é sucesso, não recupera o PDF, não libera quota, não permite exclusão definitiva.** Mantém metadados e auditoria. |

A reconciliação manual v40 existe porque um PDF fictício deletado (`d9ae7b91-af5d-452b-9430-0fb37ca9350b`) permanece como `FAILED/SOURCE_PDF_MISSING`. NÃO é correto retirar todos os DELETED da verificação, porque podem estar dentro da janela de recuperação. O operador deve investigar e reconhecer a perda **somente se realmente for um documento fictício de staging**. Em produção a função é negada pelo código. Se a origem ou o backup existir, a operação aborta.

### 2.2 Operação do backup de PDFs

- Ambiente alvo: `jurisportal-staging` (origem), `jurisportal-backup` (cópia), prefixo `staging`.
- GitHub Actions: cron `0 1 * * *` com `timezone: America/Sao_Paulo`, execução manual disponível; pode sofrer atraso.
- Até 20 lotes de 10 PDFs por execução; processo com erro não impede testar outros, mas mantém o job em falha enquanto existirem arquivos elegíveis sem proteção.
- Contrato: logs não imprimem URLs assinadas/segredos; secret do banco de staging e tokens separados por bucket. A confirmação do objeto é feita por nova leitura.
- A aba Actions precisa de monitoramento; **não foi implementado aviso externo de job ausente ou falhado.**

## 3. Modelos de Petições: o que existe

- Modelos oficiais definidos no código, não removíveis; modelos próprios do escritório com criação, atualização, arquivamento, restauração, versões e exclusão permanente autorizada ao criador/proprietário.
- Importação de DOCX/TXT para conteúdo editável, sem promessa de preservar integralmente o layout Word (tabelas, imagens, cabeçalhos e campos avançados).
- Editor de documento rico estilo A4, variáveis pré-definidas e pesquisa de cliente e processos vinculados; dados ausentes não são inventados.
- PDF gerado pelo backend para prévia, exportação e anexação ao processo. Quando anexado, entra no mesmo armazenamento privado, quota e backup dos demais PDFs.
- Geração já feita preservada mesmo quando o modelo próprio é eliminado; exclusão não apaga PDF ou peça anterior.
- Envio ao cliente e ações de IA no editor/PDF **não estão liberados**; revisão jurídica humana indispensável. Não equivale a editor DOCX de fidelidade plena nem a protocolo automático.

Principais arquivos: `src/modules/petition-templates/`, `src/components/petition-templates/`, `docs/blocos/27-*`, `28-*`, `37-*`, `38-*`.

## 4. PostgreSQL: arquitetura real do backup

- GitHub Actions `database-backup.yml`: diário `30 1 * * *` com `America/Sao_Paulo`. PDFs às 01h00; banco às 01h30.
- Banco de **staging**: `BACKUP_DATABASE_URL` via conexão Direct IPv6 (se runner suportar) ou **Session pooler IPv4 na porta 5432**. No teste real com GitHub, Direct IPv6 falhou (`Network is unreachable`); Session pooler funcionou.
- `postgres:18` executa `pg_dump --schema=public --format=custom --no-owner --no-acl`; `pg_restore --list` valida legibilidade estrutural do dump, **não equivalência de dados**.
- O runner cifra o arquivo com `age -r <chave pública>` e elimina o dump em claro em `trap` após a execução. A **chave privada fica fora do repositório, GitHub e R2**.
- Objetos: `staging/database/daily/<UTC>.dump.age` e `.sha256`. Cópias semanais (domingos UTC) e mensais (dia 1º UTC) preservadas no mesmo bucket.
- O workflow confere `ContentLength` no objeto R2; hash SHA-256 baixado e descriptografia foram relatados como aprovados pelo proprietário, com restauração isolada. **Este ambiente não acessou os recursos privados nem inspecionou os dados restaurados.**
- Não há limpeza automática/lifecycle de dumps configurada pelo código. Não ativar exclusão de versões sem política de retenção documentada e ensaiada.

### 4.1 Limites que não podem ser omitidos

1. O dump atual cobre **somente `public`**; `auth`, `storage`, papéis e configurações gerenciadas do Supabase, funções/segredos do painel, DNS, workflows e objetos R2 não são reconstruídos por esse arquivo.
2. Restaurar dados `public` num banco isolado NÃO prova que login Better Auth, conexões OAuth, sessões, cron ou uploads funcionem após desastre. Testar fluxo autenticado e integridade entre módulos no ambiente restaurado quando ele tiver sido configurado.
3. Cópia no outro bucket **da mesma conta Cloudflare** não protege contra indisponibilidade do provedor, suspensão da conta ou comprometimento das duas credenciais. Cópia offsite, política de retenção e credencial separada para remoção ainda são pendentes.
4. RPO nominal do dump diário: até aproximadamente 24 horas de dados alterados entre execuções **se** a rotina ocorrer e se completar. RTO não é garantido; medir no teste de recuperação.
5. `SHA-256` confirma integridade frente ao hash armazenado, mas ambos estão no mesmo R2. Sem assinatura/manifesto externo, um atacante com controle do bucket poderia substituir ambos. `age` protege confidencialidade, não fornece por si só imutabilidade de bucket.
6. A geração/recuperação local do dump em claro exige exclusão segura da pasta de teste após validação e tratamento como dado sensível; excluir arquivo não garante sanitização de mídia SSD.

## 5. Variáveis e segredos (apenas nomes)

| Ambiente | Nomes |
|---|---|
| Local | `DATABASE_URL`, `DIRECT_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_BACKUP_ACCOUNT_ID` (opcional), `R2_BACKUP_ACCESS_KEY_ID`, `R2_BACKUP_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`, `R2_BACKUP_PREFIX`, `DOCUMENT_PERMANENT_DELETE_ENABLED` (manter false). |
| Job de PDFs | `STAGING_DATABASE_URL`, `STAGING_R2_ACCOUNT_ID`, `STAGING_R2_ACCESS_KEY_ID`, `STAGING_R2_SECRET_ACCESS_KEY`, `STAGING_R2_BACKUP_ACCESS_KEY_ID`, `STAGING_R2_BACKUP_SECRET_ACCESS_KEY`. |
| Job do banco (Secrets) | `BACKUP_DATABASE_URL`, `R2_BACKUP_ACCOUNT_ID`, `R2_BACKUP_ACCESS_KEY_ID`, `R2_BACKUP_SECRET_ACCESS_KEY`. |
| Job do banco (Variables) | `BACKUP_AGE_RECIPIENT` (chave **pública** `age1...`), `R2_BACKUP_BUCKET`, `R2_BACKUP_PREFIX`. |

Não transferir `.env.local`, `.git`, dumps, `.backup-work`, ZIPs de testes contendo dados, chave age privada ou tokens para patches ou anexos. O ZIP usado como fonte da v40 continha `.git`; o pacote de atualização **não o reproduz**. Não se constatou `.env.local` no inventário do ZIP recebido; mesmo assim, evitar ZIP da pasta inteira sem excluir diretórios ocultos.

## 6. Migrations e comandos de diagnóstico

A base recebida contém migrations de documentos `20260920010000_process_documents_r2` e de backup `20260922010000_process_document_backups`. A correção pontual v40 **não adiciona migration nem dependência**: `backupStatus` é `TEXT` no PostgreSQL.

```powershell
npm run db:validate
npm run typecheck
npm run build
npm run test:backup
npm run test:documents
npm run test:petition-templates
npm run db:status
```

`db:status` deve confirmar schema atualizado **sem executar migrations desnecessárias**. Não usar `prisma migrate reset`, `db push`, `npm audit fix --force` nem atualizar Next.js por acidente.

Para rodar backup incremental manual de staging:

```powershell
npm run backup:documents -- --limit=5
```

Para um PDF fictício confirmado ausente em **ambos** os buckets e com `DELETED/FAILED/SOURCE_PDF_MISSING`:

```powershell
npm run backup:documents -- --acknowledge-missing=d9ae7b91-af5d-452b-9430-0fb37ca9350b --confirm-acknowledge-missing
```

O CLI não apaga PDF, não exclui o registro nem libera quota; o relatório continuará exibindo `acknowledgedMissing`. Se a checagem negar a operação, investigar em vez de alterar o status diretamente no Prisma Studio. Reabrir/recuperar um registro reconhecidamente ausente não é permitido pela API de documentos.

## 7. Protocolo de recuperação e testes

1. Confirmar que é o ambiente correto (staging, nunca produção por engano) e conservar os originais.
2. Banco: localizar par `.dump.age`/`.sha256`, baixar em pasta fora do projeto, comparar hash, descriptografar com chave privada offsite, `pg_restore --list`, restaurar em PostgreSQL **isolado**, comparar contagem e integridade referencial.
3. PDF: escolher **arquivo fictício VERIFIED**, remover apenas a cópia primária no ambiente de teste após aprovação expressa, rodar `npm run backup:documents -- --restore=<UUID> --confirm-restore`, abrir e comparar arquivo recuperado.
4. Verificar ao menos um processo com publicação, cliente, petição e PDF vinculado após recuperação, inclusive login quando o ambiente isolado estiver apto.
5. Guardar em registro de teste data, horário do snapshot, último dado recuperado (RPO observado), duração até operação (RTO observado), resultado da integridade e pessoa responsável; jamais guardar dumps/segredos no registro.

**Evidência fornecida nesta conversa:** usuário informou cópia real de PDF e backup/restauração do PostgreSQL bem-sucedidos. O teste de **restauração de um PDF específico** não foi apresentado em log nesta fase. O documento DELETED sem origem está pendente de reconciliação deliberada. Esses dois fatos são separados de “backup integral de produção homologado”.

## 8. Pendências antes do beta pago

**Backup e segurança:** monitorar jobs falhados/ausentes, cópia fora da Cloudflare, retenção/Lifecycle e exclusão de objeto em backup conforme LGPD/contrato, teste de desastre completo incluindo autenticação, revisão de RLS nas tabelas `process_document` e `organization_storage_usage` (migrations atuais **não** habilitam RLS nelas), testes cross-tenant, endurecimento de upload PDF/antivírus, verificação regular de amostras e manual operacional de incidente. Configurar Supabase quotas/conexões e alertas de custo. A restauração relatada de `public` não satisfaz sozinha estas condições.

**Produtos e módulos:** DJeN/OAB (ver seção seguinte), Comunicações e WhatsApp consentido, IA por ação/crédito, Asaas após blocos funcionais, segurança final e landing pública por último. Não anunciar esses recursos como disponíveis antes de desenvolvimento/homologação.

## 9. Handoff para Publicações/DJeN, próximo bloco funcional

A base atual consulta `comunicaapi.pje.jus.br/api/v1/comunicacao` por `numeroOab` + `ufOab` + datas, com variações de OAB. Normaliza CNJ com/sem pontuação e procura `process.cnjNormalized` na mesma organização. Ao capturar cria `publication`, `publication_recipient`, `deadline_review` e evento na linha do tempo do processo encontrado. A revisão de prazo é humana.

**Ainda não satisfaz todos os requisitos novos do proprietário:** nome cadastrado não é usado como correspondência obrigatória, tipo/complemento de OAB não tem identidade modelada; o código aceita resultados com `destinatarioadvogados` vazio, não tem segunda busca independente só por nome, nem job diário de DJeN em `.github/workflows` ou `vercel.json`. API/paginação/abrangência e retorno sem destinatário deverão ser validados com amostras reais de diferentes tribunais antes de prometer cobertura nacional. Deduplicar por chave **da publicação**, nunca só por CNJ, porque um processo possui múltiplas intimações. Resumo/links devem ser rastreáveis ao conteúdo original; DJeN não é sinônimo de todos os andamentos processuais.

**Próxima implementação em bloco próprio:** (i) contrato da API confirmado, (ii) busca prioritária por OAB+UF e conferência de nome/tipo, (iii) busca complementar por nome completo conforme parâmetros realmente suportados, (iv) deduplicação pela comunicação, (v) associação segura ao processo/advogado, (vi) resumo e link oficiais, (vii) cron/cursor/recuperação de falhas, (viii) testes reais multi-tribunal e de homônimos. Não declarar essas mudanças implementadas nesta v40 documental.
