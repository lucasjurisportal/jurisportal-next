# Bloco 32 — Documentos / Cloudflare R2 (v39, etapa 1)

## Escopo REAL desta entrega

Implementado: PDF individual de até 50 MiB, upload direto do navegador ao bucket privado por URL com assinatura AWS SigV4, validação inicial da assinatura `%PDF-`, metadados por processo, acesso isolado por organização, quota e reserva atômica por organização, listagem/download, exclusão lógica por proprietário, restauração em até 30 dias e rotina de limpeza por cron. O arquivo excluído CONTINUA ocupando quota até eliminação final. Uma migration apenas: `20260920010000_process_documents_r2`.

**Não implementado ainda:** ZIP/extração, download em lote, salvar PDF gerado por petição, renomear, hash integral do PDF/antivírus, backups criptografados do PostgreSQL, cópia de segurança R2, restauração de desastres, exportação total do escritório e análise por IA. **NÃO disponibilizar arquivos reais de clientes pagantes sem concluir e testar backups.** Este pacote é para testar staging.

## Como aplicar no seu projeto Windows

1. Faça um commit do projeto v38 atual antes de extrair esta atualização. Nunca exclua `.env.local` nem `.git` da pasta existente.
2. Use o ZIP de atualização sobre uma **cópia** do diretório `Projeto Jurisportal Next`. Para aplicar sobre a pasta existente, copie os arquivos preservando a estrutura, sem substituir seu `.env.local` nem sua `.git`.
3. No PowerShell, dentro da pasta do projeto (se as dependências já estiverem instaladas e funcionando, pode pular `npm ci`):

```powershell
npm ci
npm run db:validate
npm run db:generate
npm run typecheck
npm run build
npm run db:status
```

4. Se o status indicar apenas a nova migration de Documentos pendente e não houver conflitos ou divergência nas anteriores, em seu **banco de desenvolvimento** execute:

```powershell
npm run db:deploy
npm run db:status
npm run dev
```

Atenção: `db:deploy` aplica migrations; não execute na produção sem backup e autorização. Não use `migrate reset`, `db push` ou `npm audit fix --force`.

## Cloudflare R2 staging

Seu `.env.local` deve manter exatamente estes nomes:

```env
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="jurisportal-staging"
R2_ENDPOINT="https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com"
```

São segredos do SERVIDOR: jamais usar prefixo `NEXT_PUBLIC_` ou enviar no chat. A credencial deve estar restrita ao bucket `jurisportal-staging`, com permissão de leitura/gravação.

No painel Cloudflare: **R2 → jurisportal-staging → Settings → CORS Policy → JSON**. Cole:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "If-None-Match"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Quando houver domínio de staging/produção, adicione SOMENTE os domínios HTTPS utilizados por cada ambiente. CORS não substitui controle de acesso: somente o backend autenticado gera URLs com validade curta.

## Teste manual (dados fictícios!)

1. Inicie o app com `npm run dev` e autentique-se com 2FA.
2. Abra um processo fictício e selecione Documentos.
3. Envie um PDF pequeno e confira seu nome/tamanho na lista e no bucket staging.
4. Baixe o arquivo e abra-o. Confira o nome salvo.
5. Envie um `.txt` renomeado para `.pdf`: a conclusão deve rejeitar o arquivo.
6. Tente um PDF > 50 MiB: o navegador deve impedir.
7. Teste com quota simulada próxima ao limite: o servidor deve negar a reserva.
8. Como proprietário, exclua e recupere um arquivo; como auxiliar, não deve aparecer exclusão.
9. Abra o mesmo link de download com outra conta/organização: a API deve negar acesso.
10. Verifique que o consumo de armazenamento sobe uma vez após a confirmação, e não após erro.

## Cron de limpeza

`/api/cron/documents-cleanup` requer header `Authorization: Bearer <CRON_SECRET>`; `vercel.json` agenda uma execução diária em produção. PENDINGS expirados e documentos DELETED há mais de 30 dias passam a PURGING antes da exclusão R2 e só liberam quota após sucesso. Execute e monitore esse cron em staging antes de produção. Sem esse cron, exclusões lógicas não liberarão espaço.

## Cuidados antes do lançamento

- Validar operação real de PUT, GET, HEAD/Range e DELETE no R2 com suas próprias credenciais. Não foi possível testar a conexão real neste ambiente porque suas chaves permanecem no seu computador.
- O link de PUT é válido por 90 segundos, pode ser usado por quem o possuir e não impõe limite de bytes **no próprio R2**; por isso usamos reserva e conferência posterior, mas ainda falta defesa adicional para custo anômalo de uploads maliciosos.
- A checagem `%PDF-` é uma validação mínima de assinatura, **não** uma verificação completa de PDF nem antivírus.
- Concluir backup independente, ZIP com validação segura, download em lote e integração com petições antes de anunciar o módulo como completo.
