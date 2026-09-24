# v47 — Captura DJeN e consulta complementar ao DataJud (correção da v46)

## Diagnóstico
Captura DJeN e consulta DataJud são fontes independentes. O screenshot de staging indicava **7 resultados de DJeN**, com seis em fila de revisão, e `PROCESS_LOOKUP_TIMEOUT` apenas na segunda etapa (movimentações). Não havia evidência de timeout do DJeN nem de perda dessas sete comunicações. Os resultados em revisão precisam ser confirmados pelo advogado antes da atribuição final.

No código da v46, o modo `movements` consultava a resposta completa do processo (`_source` inteiro), inclusive campos desnecessários, até 30 segundos; o navegador aguardava essa chamada para finalizar o mesmo fluxo visual, exibindo falha complementar sob o bloco DJeN. Além disso, `normalizeDatajudMovements` cortava os primeiros 100 movimentos **antes** de ordenar por data: se o tribunal retornasse os mais antigos primeiro, movimentos novos não chegavam à lista.

## Alterações
1. Consulta de movimentos com `_source.includes` de CNJ e campos de movimentos, sem trazer a capa completa. Resposta ainda pode ser grande e demorada porque source filtering não fatia arrays na origem. Timeout explícito dessa etapa reduzido para 12 segundos; a consulta de dados cadastrais mantém 18 segundos.
2. Retorno do DataJud com `timed_out: true`, mesmo HTTP 200, não pode ser salvo como importação completa. Erros de consulta escrevem log `[datajud.lookup]` com código, tipo, tribunal e duração, **sem CNJ, nome, payload ou chave**.
3. A interface atualiza a listagem do DJeN antes da verificação opcional de movimentos. Mensagem de indisponibilidade do DataJud é separada e neutra; não altera o estado nem os resultados da captura DJeN. Orçamento da verificação complementar na experiência manual reduzido para 22 s entre processos; falha no provedor ou falha de rede interrompe o lote, em vez de multiplicar requisições lentas. Caso a própria captura do DJeN esteja incompleta, não iniciar a etapa adicional de movimentações nessa tentativa.
4. Ao importar movimentos, ordenar por `occurredAt` (mais recente primeiro) **antes** de selecionar os 100. Continuar deixando claro o truncamento e mantendo os itens já salvos. Nunca declarar atualização integral da carteira por esse botão de desenvolvimento.
5. Nenhuma alteração em processo/cliente ou prazo, sem exclusão, sem migração e sem novo fornecedor. Regras de sessão/organizationId e persistência da v46 preservadas. Peças processuais permanecem em P&D, CRON desativado.

## O que a correção NÃO garante
- Não há prova de que a API DataJud responderá em tempo útil no Windows de Lucas. Nem o filtro de campos nem reduzir o timeout resolvem indisponibilidade, sobrecarga, proxy, 429 ou problemas de rota/rede. Não confundir resposta 200 do DJeN com sucesso do DataJud.
- A consulta pública não oferece paginação de movimentos embutidos uniforme; filtro `_source` **não limita** o número de elementos de `movimentos`. Para processos muito grandes, precisamos de fonte ou método paginado adequado, job fora da interface e métricas de latência antes da produção.
- Os movimentos são metadados e não documentos/PDFs; cronograma e disparo de produção ainda não ativados.

## Testes locais
Após extrair: `npm run test:process-lookup`, `npm run test:publications`, `npm run typecheck`, `npm run build`. Teste com o mesmo CNJ: ver resultado DJeN sem aguardar retorno DataJud, importar movimentos se responder, repetir e observar zero duplicatas, conferir Aba Movimentações e último movimento. Se timeout persistir, coletar somente logs `[datajud.lookup]` de `mode: 'movements'` com `court`, `code`, `elapsedMs`, `upstreamStatus` (sem dados pessoais). O servidor precisa ser reiniciado ao substituir código. Não alterar `.env.local`, migration ou Git até passar testes; stage v46 pendente junto da v47 com a listagem de status revisada.
