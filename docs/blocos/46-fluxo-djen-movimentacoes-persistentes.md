# v46 — Fluxo DJeN → movimentações de processos existentes

## Decisão de produto
- **Criar processo não consulta movimentações nem baixa peças.** O cadastro consulta somente campos essenciais da capa processual quando o advogado clicar no botão próprio.
- Ao executar o botão de verificação do DJeN em desenvolvimento, capturamos publicações e depois buscamos movimentos **de processos já cadastrados no mesmo escritório**, em seleção rotativa pelo horário da última tentativa, sem deixar processos repetidos monopolizarem o lote. A cada verificação há limite de 20 processos, que são distribuídos entre verificações seguintes. O CNJ completo é a chave de ligação; sem processo cadastrado não ocorre consulta complementar ou importação.
- O processo exibe os movimentos persistidos em sua aba Movimentações, mesmo sem fonte externa disponível. A listagem prioriza a importação recente (até 200 linhas) para que o link Saiba mais alcance o registro recém-adicionado. Novo lote apresenta `X movimentações adicionadas. Saiba mais`, com link e âncora para um registro novo.
- A central de publicações continua só para comunicações **sem processo vinculado**. Intimações vinculadas permanecem na aba Publicações e Intimações do processo e a revisão do prazo nunca é considerada concluída automaticamente.
- **Peças/PDFs não são importados nesta versão.** Dependem de interface documental autorizada no sistema oficial, credenciais pertinentes e projeto de P&D posterior, especialmente para autos protegidos. O DataJud público não fornece os PDFs da íntegra dos autos.
- CRON e agendamento de produção permanecem desativados por decisão do proprietário.

## Implementação
- Query da capa reduzida a campos necessários (`_source.includes`), dois candidatos no máximo para detectar instâncias distintas, sem movimentos, grau e sistema; não inventa comarca/fórum/distribuição/valor quando faltarem. Campo `dataAjuizamento` não é convertido em data de distribuição. Falha/timeout da API não impede cadastro manual nem destrói campos já preenchidos.
- Model `ProcessExternalMovement` aditivo, chave única por escritório + processo + origem + identidade determinística. `createMany(skipDuplicates)` com contagem de novos itens, auditoria sem dados pessoais em metadados. O retorno do provedor continua limitado a 100 movimentos por processo; aviso explícito de truncamento. Não excluir movimentos previamente salvos quando não retornados numa janela posterior.
- O DataJud não apresenta identificador público uniforme de movimentação neste contrato. Hash de código + texto + data + órgão e ordinal para ocorrências idênticas é **deduplicação de melhor esforço**, não igualdade jurídica garantida após retificação. Fonte e horário original mantidos.
- Segunda chamada por processo feita pelo cliente após concluir DJeN. A consulta complementar somente alcança os processos selecionados naquela rodada, sem declarar toda a carteira atualizada. Assim timeout/429/403 do DataJud não desfaz publicações. Máximo de 20 processos por clique; quantidade além do limite é informada ao usuário, e é selecionada nas consultas seguintes por `lastMovementCheckAt`. Uma interrupção antecipada por 429/desativação também informa processos que ficaram sem verificação. Uso massivo exigirá worker/filas e checkpoints dedicados antes de produção. Sem prometer varredura integral de todos os processos do plano.
- A API de movimentações valida sessão e `organizationId` ANTES da consulta; endpoints impedem consultar ID de outro escritório. Leitura de movimentos sempre filtra organização + processo.

## Limites e validação pendente
- Aplicar migration **somente em staging** após revisar conexão e SQL; executar `npm run db:validate`, `npm run db:generate`, `npm run test:process-lookup`, `npm run test:publications`, `npm run typecheck`, `npm run build`.
- Teste real: processo existente com DJeN, duas buscas iguais, teste de outro escritório, simulação de 429 e timeout, link de notificação, ausência de processo, diferentes ramos e múltiplas instâncias.
- Verificação de requisitos legais e fonte para uso comercial do DataJud permanece gate de lançamento.
