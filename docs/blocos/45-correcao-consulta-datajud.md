# Jurisportal Next v45: correção da consulta da capa processual

## Ocorrência e diagnóstico verificável
Em teste local, Lucas relatou que um CNJ anteriormente consultado deixou de preencher os campos após aplicar a v45 e a interface exibiu somente «consulta indisponível». Não há log HTTP/status da consulta real anexado; **não declarar causa externa comprovada**.

A comparação v44/v45 confirma uma regressão de desenho: em v44, `lookupDatajudProcess` normalizava somente a capa; na v45, foi alterado para chamar `lookupDatajudProcessDetail`, que baixava e normalizava todas as movimentações, mesmo quando o usuário queria apenas preencher o cadastro. O timeout era 9 segundos para ambas as ações. O formulário traduzia timeout, erro de rede, 403/401, resposta inválida e erro HTTP da fonte na mesma frase, impedindo diagnóstico.

## Correção entregue
- Consulta de capa agora envia `_source.excludes: ["movimentos"]` na pesquisa DataJud, preservando demais metadados existentes na resposta. Movimentos continuam disponíveis somente na rota específica da aba Movimentações, sob demanda.
- Timeouts distintos: 18 s para a capa, 30 s para movimentos. Não há retry automático de HTTP 429.
- Erros estáveis e diferenciados: `PROCESS_LOOKUP_DISABLED`, `PROCESS_LOOKUP_AUTH_FAILED`, `PROCESS_LOOKUP_TIMEOUT`, `PROCESS_LOOKUP_NETWORK_ERROR`, `PROCESS_LOOKUP_RATE_LIMIT`, `PROCESS_LOOKUP_INVALID_RESPONSE`, `PROCESS_LOOKUP_SOURCE_UNAVAILABLE`, `PROCESS_LOOKUP_MULTIPLE_MATCHES`, `PROCESS_LOOKUP_NOT_FOUND`. O frontend traduz esses códigos em mensagens acionáveis.
- APIs registram somente código interno e status HTTP upstream, sem CNJ, resposta original, chave, documentos, nomes de partes ou tokens.
- Nenhuma migration, alteração de credenciais, variáveis ou dependências. Não altera capture DJeN, CRON, backups ou IA.

## Homologação necessária no Windows
1. `npm run test:process-lookup`, `npm run typecheck`, `npm run build`.
2. Reiniciar `npm run dev` para reaplicar o ambiente; testar o mesmo CNJ público que funcionou na v44, com os campos vazios.
3. Se falhar, registrar SOMENTE a mensagem da tela e a linha `[process.lookup] { code, upstreamStatus }` do terminal. Não mandar `.env.local`, chave da API nem dados privados do processo.
4. Validar aba Movimentações separadamente, incluindo processo com muitos movimentos. A API pode continuar intermitente, sem dados ou recusar credencial; o patch corrige o peso indevido da consulta e a ausência de diagnóstico, não garante disponibilidade do CNJ.

## Testes feitos nesta entrega
14 testes isolados (domínio e cliente, fixtures): todos aprovados em executor de transpilation TypeScript, incluindo seletor `_source`, distinção entre capa e movimentações, HTTP 403, 503, JSON inválido e falha de rede. Inspeção sintática de 6 arquivos TS/TSX alterados: sem diagnóstico. `npm` completo, typecheck Next.js, build, API real e Supabase do usuário NÃO puderam ser executados neste ambiente por indisponibilidade do registry. Testes de segurança ponta a ponta ainda pendentes.

## Peças processuais (próxima integração, não incluída neste patch)
A API Pública DataJud usada pelo conector fornece metadados de capas/movimentos, não PDFs íntegros das peças nem credenciais para autos. Não inventar arquivo a partir do nome da movimentação e não criar documento vazio. A ingestão real requer fonte autorizada (eproc/PJe/e-SAJ/fornecedor com APIs e permissões) ou exportação autenticada do advogado; mapear cada peça a CNJ, organização, instância e origem, deduplicar por identificador de documento/hash, guardar PDF privado no R2 via módulo de Documentos com quotas e auditoria, validar sigilo e vincular ao processo existente. Não usar o DataJud para fingir integração documental.
