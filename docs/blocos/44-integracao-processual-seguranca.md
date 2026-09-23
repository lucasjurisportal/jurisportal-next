# Jurisportal Next v44: consulta processual complementar e escopo de escritório

## Origem e escopo
Base: ZIP da pasta do projeto recebido neste chat + patches v41, v41 correções, v42 e v43, aplicados em ordem. Este pacote é **incremental** e não substitui arquivos não listados. A especificação IA de 23/09/2026 é decisão de produto, não declaração de IA operacional: Luna/Terra, cotas 0/0/100/500/2.000/5.000 (Free/Essencial/Estratégico/Premium/Executivo/Alta Corte), sem chatbot livre e sem IA necessária para captura, dedup e vinculação. Não modificar política de IA nesta versão.

## Funcionalidade entregue
- Contrato isolado `ProcessLookupPreview` e cliente de API pública DataJud para consulta por CNJ, SOMENTE quando habilitado expressamente e respaldado pelo uso autorizado.
- Roteamento seguro de Justiça Estadual, Federal e do Trabalho por campo do CNJ. Outros ramos ficam indisponíveis até tabela validada. URL da consulta é prefixo fixo + alias controlado; sem URLs arbitrárias.
- Retorno de classe, assunto principal quando inequívoco, órgão julgador, tribunal, grau, sistema eletrônico, ajuizamento, comarca/fórum SOMENTE se presentes. Ajuizamento não é distribuição e código IBGE não é fórum. Múltiplos resultados impedem escolha arbitrária.
- Ação `Consultar dados do processo` no cadastro e edição quando fonte habilitada; preenche SOMENTE campos vazios após conferência do usuário; não altera CNJ, cliente, advogado, partes, valor da causa, prazo ou data de distribuição.
- Endpoint autenticado sem consulta por ID de processos de outros escritórios; resposta reduzida a metadados de fonte, não expondo credencial nem resposta bruta.
- Mutação do processo reescopada por `organizationId` também na gravação/limpeza de partes e clientes; leitura/seleção de responsável e vinculação DJeN já estavam escopadas.
- Nenhuma migration: os campos necessários já existem em `Process` da v43. A estrutura de movimentações externas persistentes com chave única/idempotência e vínculo a instância NÃO foi adicionada; não misturar movimento com DJeN nem importar itens não validados.

## Bloqueio jurídico/operacional
Portaria CNJ 374/2026, art. 4 §§2º-3º: uso da API pública e dados para fins não comerciais e proibição de exploração comercial. A existência de concorrentes não comprova sua licença. Solicitar análise jurídica/autorização ou contratar fonte alternativa antes do uso comercial. O código instala com `PROCESS_LOOKUP_PROVIDER=disabled`. Para staging autorizado: `PROCESS_LOOKUP_PROVIDER=datajud-public`, `DATAJUD_ACCESS_AUTHORIZED=true`, `DATAJUD_API_KEY` conforme wiki; em `NODE_ENV=production` exige ainda `DATAJUD_COMMERCIAL_AUTHORIZATION_CONFIRMED=true` após autorização comprovada. Não habilitar por simples desejo de testar comercialmente. Não inserir chave em repositório.

## Testes e limitações
`npm run test:process-lookup`, `npm run test:processes`, `npm run test:publications`, `npm run typecheck`, `npm run build`. Testes unitários usam fixture, não consultam CNJ. Não foi homologada resposta real nem conexão ao Supabase do usuário nesta entrega. Falhas do fornecedor mantêm cadastro manual acessível. Sem alteração de CRON ou envio automático de IA.

## Segurança: gate de lançamento, não garantia abstrata
Os testes unitários de escopo impedem omissão acidental do filtro em operações cobertas, mas NÃO substituem testes de intrusão com dois usuários/sessões reais e banco staging, revisão de todas as APIs de documentos/download e de RLS, tokens, presigned URLs, auditoria e IA. O Prisma pode operar com função que contorna RLS; auditar roles e políticas efetivas antes de declarar isolamento homologado.

## Próximo aceite operacional
1. Verificar v43 email consolidado e notificação sem duplicação em staging; 2. Exercitar cadastro e edição com CNJ de vários ramos, processo duplicado em dois escritórios, homologar a fonte autorizada; 3. Definir origem licenciada de movimentos e criar persistência única (org, fonte, instância, ID), preservando cancelamentos e reprocessamento; 4. Testes cross-tenant completos + revisão RLS antes de clientes reais; 5. Só então iniciar camada IA descrita na especificação vigente. CRON permanece desativado.
