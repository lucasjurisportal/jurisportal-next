# v62 — Acabamento visual, créditos de IA e primeiro resumo assistido

Data de preparação: 26/09/2026.

## Objetivo

A v62 inicia o acabamento visual progressivo do Jurisportal Next sem mudar a arquitetura de navegação já aprovada e transforma a fundação de créditos criada na v61 em algo visível e utilizável pelo escritório. Também prepara a primeira ação real de IA do lançamento: resumo assistido de publicação/intimação.

## 1. Saldo de IA sempre visível

- O cabeçalho protegido passa a carregar o saldo de créditos da organização em todas as páginas do sistema.
- O saldo aparece em um cartão compacto com ícone de moeda, valor disponível e franquia mensal.
- Para o proprietário, o cartão aponta para `Plano e cobrança > Créditos de IA`.
- Para auxiliares, o saldo é somente informativo, evitando oferecer acesso indevido à gestão do plano.
- O cabeçalho permanece `sticky` no desktop e no celular, de modo que o saldo continue visível durante a navegação.
- Planos sem IA mostram saldo zero sem bloquear as funções não relacionadas à IA.

## 2. Plano e cobrança

A área de créditos foi redesenhada com:

- ícone de moeda;
- saldo disponível em destaque;
- barra de consumo mensal;
- créditos usados;
- créditos reservados em operações em andamento;
- período da competência;
- orientação de que a compra avulsa de créditos ainda não está habilitada.

A contabilidade continua usando a estrutura transacional da v61. Esta versão não altera as franquias comerciais.

## 3. Acabamento visual inicial

Foi aplicado um primeiro passe de refinamento no shell, Dashboard e cartões principais:

- espaçamento um pouco mais confortável;
- cantos e sombras mais consistentes;
- navegação lateral com ícones melhor delimitados;
- cabeçalho mais limpo;
- Dashboard com melhor hierarquia visual;
- preservação dos dez temas de aparência;
- preservação do desenho funcional e da distribuição dos módulos.

Este é um acabamento incremental. Os demais módulos podem receber refinamentos próprios nos próximos blocos sem redesenhar o sistema.

## 4. Primeira ação real de IA: resumo de publicação

Em uma publicação/intimação, planos com a capacidade `ai.publicationSummary` passam a ver o cartão **Assistente Jurisportal > Resumo com IA**.

Antes de executar, o botão mostra a estimativa de créditos calculada pelo backend a partir do tamanho do texto. Depois da execução, o sistema mostra o custo efetivamente contabilizado.

A saída é estruturada em:

- resumo;
- pontos principais;
- datas mencionadas literalmente;
- alertas;
- pontos que precisam de conferência.

A interface lembra expressamente que:

- o resultado é rascunho para revisão humana;
- a IA não calcula prazo jurídico definitivo;
- o texto integral continua sendo a fonte principal;
- nenhuma ação é confirmada automaticamente.

## 5. Segurança e isolamento

O fluxo do resumo:

1. obtém organização, usuário e plano da sessão autenticada;
2. confirma que a publicação pertence à organização;
3. confirma que o plano possui a capacidade;
4. calcula uma reserva máxima de créditos;
5. reserva créditos de forma transacional usando a trava por organização já criada na v61;
6. grava uma geração auditável;
7. envia somente o texto necessário e metadados mínimos ao provedor;
8. valida a resposta estruturada;
9. liquida apenas o custo efetivo;
10. libera a reserva quando a chamada falha antes da liquidação.

O texto recebido do DJeN é tratado como dado não confiável. As instruções do provedor mandam ignorar comandos eventualmente escritos dentro da própria publicação. O modelo não recebe ferramentas, navegação web, banco de dados, e-mail ou qualquer capacidade de executar ações no Jurisportal.

O conteúdo-fonte não é duplicado na tabela `ai_generation`; nela ficam resultado, auditoria, versão de prompt, modelo, consumo e status.

## 6. OpenAI / Responses API

A integração usa chamada server-side à Responses API com Structured Outputs por JSON Schema e `store: false`.

Os IDs de modelo ficam em variáveis de ambiente, sem ficarem presos ao código:

- `OPENAI_MODEL_LUNA`
- `OPENAI_MODEL_TERRA`

Na data desta versão, o `.env.example` usa `gpt-5.6-luna` e `gpt-5.6-terra`, mas eles continuam configuráveis para permitir troca posterior sem alteração da regra de negócio.

A resposta REST bruta é lida de `output[].content[]`, aceitando conteúdo `output_text` e tratando recusa do modelo. Não se depende apenas do helper `output_text` exposto por SDKs.

## 7. Configuração

Novas variáveis no `.env.local` quando chegar a hora do teste controlado:

```env
AI_PROVIDER_ENABLED="false"
OPENAI_API_KEY=""
OPENAI_MODEL_LUNA="gpt-5.6-luna"
OPENAI_MODEL_TERRA="gpt-5.6-terra"
```

A chave nunca deve usar prefixo `NEXT_PUBLIC_` e nunca deve entrar no Git.

Com `AI_PROVIDER_ENABLED=false`, o restante do Jurisportal continua funcionando e a tentativa de geração recebe aviso de que o provedor ainda não foi habilitado.

O comando `npm run diagnose:ai` é somente local: verifica presença da configuração sem mostrar a chave e sem enviar qualquer publicação ao provedor.

## 8. Banco

Migration nova:

`prisma/migrations/20260926033000_v62_ai_generation/migration.sql`

Ela cria `ai_generation`, com vínculo opcional à publicação e índices por organização/ação/status. Não altera nem exclui processos, publicações, documentos ou créditos existentes.

## 9. Validação necessária no Windows

Antes do Git:

```powershell
npm run db:validate
npm run db:status
npx prisma migrate deploy
npm run db:generate
npm run test:ai-credits
npm run test:ai-publication
npm run test:publications
npm run typecheck
npm run build
```

O teste real do provedor só deve ocorrer depois de configurar a chave em staging e habilitar `AI_PROVIDER_ENABLED=true` para uma publicação controlada.

## 10. O que não muda nesta versão

- CRON continua desligado.
- Não há IA no Free nem no Essencial.
- Não há compra avulsa de créditos.
- Não há decisão jurídica automática.
- Não há protocolo, envio de peça, cálculo definitivo de prazo ou alteração automática de processo pela IA.
- Não há integração financeira nova.
- Os resíduos antigos locais `APLICAR-v40.txt` e os manifestos da v45 não fazem parte desta versão.

## Validação realizada durante a preparação

Foi feita checagem sintática isolada dos 13 arquivos TypeScript/TSX diretamente alterados nesta entrega, sem erros de sintaxe. Não houve acesso ao Supabase do usuário, execução da migration no banco real, chamada paga ao provedor, `typecheck` completo ou `next build` completo neste ambiente. A homologação depende dos comandos acima no Windows.
