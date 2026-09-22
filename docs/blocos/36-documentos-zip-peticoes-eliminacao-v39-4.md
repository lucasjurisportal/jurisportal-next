# Jurisportal Next v39.4 — Documentos (etapa funcional complementar)

## Escopo entregue para validação local

- ZIP com apenas PDFs, até 100 MiB compactados, 500 MiB descompactados, 200 PDFs e 50 MiB/PDF.
- Pré-validação do diretório central antes da descompressão; rejeita traversal, outros formatos, entrada duplicada, arquivos criptografados, symlink, ZIP64, compressão incompatível, declaração desproporcional (ZIP bomb).
- PDF individual continua usando o serviço v39 de autorização, quota, reserva concorrente, confirmação e auditoria. Não usa upload direto de ZIP bruto ao R2.
- Download de todos os PDFs ativos do processo em ZIP, gerado no navegador, limitado inicialmente a 200 MiB para evitar travamento. Falhas abortam a exportação incompleta.
- Botão "Salvar PDF nos documentos do processo" para rascunhos com processo vinculado; gerado no servidor e sujeito à quota.
- Exclusão definitiva de documento excluído, somente proprietário, bloqueada por padrão por `DOCUMENT_PERMANENT_DELETE_ENABLED=false`. Deve permanecer desligada até existir backup independente e teste de restauração.

## Não entregue e não habilitar produção ainda

- Backup automatizado de banco e R2 e teste de restauração real (próximo bloco de Documentos).
- Extração de ZIP grande em jobs/fila para navegadores de pouca memória.
- Criação de prazo/ação jurídica por IA. O painel IA permanece desativado.
- Envio de arquivos reais de clientes sem backup validado.

## Aplicação

Aplicar o ZIP sobre uma cópia do código **após v39.3**. Não substituir `.env.local`, `.git` ou migrations. O ZIP contém `package.json` e `package-lock.json`, adicionando `fflate` como dependência direta (já existia como dependência transitiva, mas isso não garante contrato estável).

```powershell
npm ci
npm run db:generate
npm run typecheck
npm run build
npx tsx --test src/modules/documents/domain/zip-policy.test.ts
npm run db:status
npm run dev
```

Sem novas migrations. Para usar exclusão definitiva no futuro, configurar flag do servidor somente após teste de backup; jamais adicionar `NEXT_PUBLIC_`.

## Testes funcionais

1. Processo fictício: enviar ZIP com dois PDFs e subpasta, acompanhar progresso individual e verificar quota.
2. ZIP com TXT ou `../`: rejeitar lote inteiro, não cadastrar PDFs parciais.
3. ZIP >100 MiB ou PDF >50 MiB: rejeitar sem iniciar upload.
4. Baixar todos: verificar PDF(s) e nome útil do ZIP.
5. Gerar petição com processo selecionado: salvar PDF no processo, abrir aba Documentos e visualizar. Sem processo, botão não aparece.
6. Excluir documento: mostrar em recuperação e manter quota. Exclusão definitiva permanece desabilitada até teste dos backups.

## Próximo estágio obrigatório do mesmo bloco

Configurar rotina automatizada criptografada de `pg_dump`, recuperação com credenciais isoladas, cópia R2 em bucket separado com retenção de 90 dias, cópia externa a fornecedor distinto e restauração de ponta a ponta em staging, incluindo verificação do vínculo documento-processo. Conferir custos e limites do serviço de scheduler antes de publicar. Só então habilitar exclusão definitiva em produção.
