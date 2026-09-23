# Jurisportal Next v43 | DJeN: distribuição, resumos e cadastro processual

## 1. Base e objetivo

Patch incremental aplicado sobre a pasta da v40 do ZIP enviado, seguida na ordem pelos patches consolidados da v41, correção de normalização, ajustes de v41 e v42. Preserva migrations e dados. **Não ativa CRON, não altera chaves nem Vercel/GitHub**. Compatibilidade com modificações locais posteriores ao ZIP v42 precisa ser conferida antes de substituir arquivos.

## 2. E-mail consolidado por advogado

- Cada comunicação confirmada (Publicação) gera **um registro de entrega por OAB destinatária** dentro da mesma transação em que a publicação e o destinatário são gravados; `@@unique([publicationId,lawyerOabId])`. Resultados de identidade incerta em `DjenReviewCandidate` não são enfileirados até aprovação do proprietário.
- Um envio por usuário e lote, até 30 destinos (linhas) por mensagem. Uma publicação comum a duas OABs do mesmo usuário aparece apenas uma vez dentro do e-mail. Dois advogados distintos recebem seus respectivos comunicados.
- Conteúdo: nome do advogado, intimações / publicações separadas, tipo, CNJ, tribunal, órgão, documento, partes se fornecidas, resumo textual rastreável, link para a central do Jurisportal (HTTPS em servidor).
- Só envia para usuário pertencente ao escritório, OAB ativa, endereço verificado e publicação ativa. Não manda para o proprietário caso ele não seja titular de OAB destinatária.
- Outbox `publication_email_delivery`: `PENDING → SENDING → SENT`, `FAILED` após erro para retry e `UNKNOWN` quando o resultado da entrega requer conciliação humana (ex.: janela de idempotência de 24h do Resend expirou). `SENT` significa **aceito pela API do provedor**, não que o destinatário abriu ou recebeu na caixa postal. Para confirmar entrega real é necessário implementar webhooks próprios, fora desta versão.
- Chave de idempotência para lote, captura e tentativas repetidas; alterações no e-mail do destinatário durante retry suspendem o lote para conciliação. Não notifica novamente uma comunicação já aceita por e-mail em capturas posteriores.
- Captura manual e aprovação de identidade chamam o dispatcher. A rota CRON existente também está preparada para chamar o dispatcher **somente se um dia for homologada e ativada**.
- O flag `PUBLICATION_EMAIL_ENABLED` é `false` por padrão. Requer `RESEND_API_KEY` e `RESEND_FROM` de domínio validado no Resend; `NEXT_PUBLIC_APP_URL` em homologação é a URL do aplicativo. Em produção, não usar endereço de testes `onboarding@resend.dev`.
- Comunicações capturadas antes da migration não são automaticamente enfileiradas. Uma nova captura da mesma comunicação cria a entrega ausente sem duplicar a publicação. Não fazer backfill em massa sem validação do destinatário e consentimento.

## 3. Sino do proprietário

- Proprietário enxerga publicações não tratadas do escritório e resultados DJeN sem identidade confirmada. Auxiliar enxerga somente suas publicações e seus demais itens operacionais; o dono não recebe e-mail de uma OAB alheia.
- Abrir/ler uma comunicação não confirma prazo nem marca como tratada. Revisão humana obrigatória.

## 4. Dados do processo novo

- O número CNJ, tribunal, órgão e partes continuam vindo somente da publicação. A v43 extrai **campos expressos na fonte**, quando existirem: data de distribuição (`dataDistribuicao`), classe, assunto principal, comarca e nome explícito do fórum. A data de disponibilização DJeN e `dataAjuizamento` **não** são usadas como data de distribuição.
- Campo **Fórum** passa a existir separadamente do campo Comarca. Uma cidade não identifica sua vara, seu fórum, seu ramo judiciário ou seu grau. Ex.: Poá, cível e trabalhista. Uma vara citada sem fórum explícito não resulta em fórum presumido. Dados ausentes ficam editáveis e vazios.
- Comarca só é extraída automaticamente quando a expressão `Comarca de/da/do ...` ou campo explícito existir. NÃO inferir de CNJ/município aparente ou de parte.
- Responsável sugerido é o titular da OAB destinatária, se for integrante único; com múltiplos advogados distintos o campo não é atribuído arbitrariamente. O seletor mostra **somente nomes**, sem `owner` ou `member`.
- Após criar processo a partir de publicação, o serviço transacional existente vincula, pelo CNJ + organização, as comunicações do escritório e cria timeline; o formulário redireciona à aba `?tab=publicacoes`. A lista central passa a exibir comunicações ainda SEM processo; as vinculadas ficam na aba do processo, mas continuam pendentes de revisão de prazo quando aplicável e notificadas no sino.
- CPF/CNPJ de partes, classe, assunto, valor e data ausentes não são inventados nem buscados por scraping do eproc.

## 5. Observação jurídica e integração futura

A API Pública do DataJud não foi integrada automaticamente a este SaaS comercial porque o texto vigente da Portaria CNJ 160/2020, alterado pela Portaria 374/2026, estabelece dados para fins legais **não comerciais** e veda exploração comercial. Antes de consumo comercial é necessária análise/autorização adequada ou conector oficial licenciado/contratado com tribunal/fornecedor. Fontes: https://atos.cnj.jus.br/atos/detalhar/3453 e https://atos.cnj.jus.br/atos/detalhar/6972 . Eproc, PJe, e-SAJ e serviços equivalentes exigem verificação específica de acesso e contrato; não usar CAPTCHA bypass, scraping autenticado indevido nem preencher fórum por dedução.

## 6. Migração e riscos

`20260923150000_v43_publications_email_process_metadata/migration.sql`: aditiva, cria `process.forum`, `publication.processMetadata`, `publication_email_delivery`. Requer validação com `npm run db:validate`, `npm run db:status`, aplicação em staging com `npx prisma migrate deploy`, `npm run db:generate` e testes antes de produção. Não editar migrations anteriores nem usar `db push/reset`. Não executar em banco errado; `DIRECT_URL` deve ser staging.

## 7. Testes locais e homologação

Rodados no ambiente de preparação: 36 testes de domínio DJeN/publicações por transpilation TS; sintaxe de todos arquivos TS/TSX analisada, sem erro. **Não** houve `npm run typecheck`, `npm run build`, Prisma validate/deploy nem integração com CNJ, Supabase ou Resend; npm ci expirou. O Lucas deve rodar `npm run test:publications`, `npm run test:processes`, `npm run typecheck`, `npm run build` no Windows após `db:generate`.

Teste funcional: (1) publicação nova da OAB de teste; (2) consulta repetida sem duplicata; (3) fila só da inscrição correta; (4) revisão de identidade aprovada envia apenas após aceite; (5) um e-mail por advogado por lote; (6) dono recebe sino; (7) campo de comarca e fórum vazios quando não enviados; (8) duas OABs no mesmo advogado, sem comunicação duplicada no e-mail; (9) vinculação CNJ, retirada da caixa central, presença na aba de processo, prazo continua pendente; (10) erro Resend não apaga publicação e permanece na outbox; (11) flag off não faz chamadas a e-mail.

**Gate de ativação do e-mail:** domínio remetente verificado no Resend; testar OAB e e-mail fictícios; configurar `PUBLICATION_EMAIL_ENABLED=true` só depois. **CRON permanece desativado** por decisão do proprietário até implantação e homologação do servidor.
