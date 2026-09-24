# Jurisportal Next v45: diagnóstico de campos ausentes, roteamento CNJ e movimentações externas

## Base
v44 montada a partir do ZIP original e patches sucessivos v41–v44 deste chat. Patch incremental; não altera migrations, schema Prisma, backup, CRON, DJeN ou IA. Ativação de consulta mantém as regras e variáveis da v44.

## Diagnóstico comprovado pelo código
- `normalizeDatajudProcess` da v44 só preenche `comarca` se existir `source.comarca`, `fórum` se existir `source.forum`, e define `distributionDate: null`. `caseValue` não faz parte de `ProcessLookupPreview` nem é consumido no formulário. Logo, esses campos vazios NÃO comprovam falha HTTP ou problema do cadastro; o conector não possuía dados verificados para eles.
- O glossário oficial do DataJud lista `dataAjuizamento`, `orgaoJulgador.nome`, `orgaoJulgador.codigoMunicipioIBGE`, classe, assuntos e movimentos; não promete valor da causa, fórum, comarca ou data de distribuição como campos padronizados. `codigoMunicipioIBGE` é município do órgão, NÃO comprova comarca/fórum. `dataAjuizamento` não substitui distribuição. O código CNJ 8 identifica Justiça Estadual; 4 Justiça Federal; 5 Justiça do Trabalho.
- Erro real corrigido: roteamento anterior enviava ramo 5 ao `trf` e ramo 4 ao `trt`. Agora 4 = `trf`, 5 = `trt`, com testes. Nome de `sistema` no DataJud é objeto; normalizador anterior esperava string e não preenchia EPROC/PJe corretamente. Corrigido.

## Implementação
- Barra de progresso indeterminado acessível aparece durante a consulta de cadastro e a consulta de movimentações, sem inventar percentuais de progresso que a API não fornece.
- Normalizador registra `municipalityIbgeCode` como referência técnica e não como comarca; sistema eletrônico identifica objeto `sistema.nome`. Mensagem do cadastro explica o motivo dos campos pendentes. Valor da causa e distribuição permanecem editáveis pelo advogado, sem preenchimento presumido.
- Consulta de movimentos no processo: nova aba **Movimentações**, leitura sob demanda por botão, execução server-side com sessão autenticada. A rota valida `organizationId` contra o processo ANTES de chamar a API; usa somente o CNJ da entidade autorizada, não CNJ recebido pelo navegador. Sem vazamento de chave de API ou resposta bruta.
- Exibe código, descrição, data e órgão quando informados, com limite de 100 itens na ordem recebida da fonte e contagem total. Não supõe cronologia completa, nem converte data sem fuso em horário confirmado de São Paulo; dados externos não se confundem com publicações DJeN nem com eventos internos. Não cadastra prazos nem movimentações no PostgreSQL e não gasta crédito de IA.
- API com múltiplas capas/instâncias no mesmo CNJ permanece bloqueada para seleção automática: é necessário incorporar escolha de instância numa futura integração. Falha de API não bloqueia cadastro/consulta às publicações e processos existentes.

## Testes e limitações
`npm run test:process-lookup`, `npm run test:processes`, `npm run test:publications`, `npm run typecheck`, `npm run build`. Testar em staging com CNJ público estadual, federal e trabalhista. Não compartilhar resposta bruta de API nem dados privados. Sem banco real ou API do usuário acessível a esta entrega, não declarar homologação real. Se o tribunal não informar `movimentos`, listagem vazia será correta para aquela resposta, não prova ausência de atos no tribunal.

## Fonte/autorização
Wiki oficial DataJud: `https://datajud-wiki.cnj.jus.br/api-publica/glossario/`. Termo atual: `https://datajud-wiki.cnj.jus.br/api-publica/termo-uso/`. Produto comercial não deve depender de pressuposto de permissão; não ativar produção sem resolver termos/credenciamento/fonte licenciada.

## Próximas integrações
Conector complementar autorizado para capa processual que inclua valor da causa, data de distribuição, comarca e fórum quando informados. Salvar movimentos externos e sincronizá-los requer identidade estável por tribunal+grau+origem+movimento e estratégia de atualização/cancelamento antes de migração. Segurança RLS, autorização e teste com dois escritórios são gates pré-lançamento. CRON continua fora desta etapa.

## Procedimento operacional de validação
Após extrair o patch na pasta atual: `npm run test:process-lookup`, `npm run test:processes`, `npm run test:publications`, `npm run typecheck`, `npm run build`. Depois iniciar `npm run dev`, consultar um CNJ público estadual e testar a aba Movimentações de um processo cadastrado. O campo fórum, comarca e valor da causa continuam manuais quando não identificados por fonte autorizada. Sem migration ou regeneração Prisma nesta v45. Conferir `docs/blocos/45-arquivos-patch.txt` no Git antes de registrar.
