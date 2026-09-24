# v49 — DataJud: diagnóstico de rede e Plano e cobrança (prévia)

## Base e propósito
Patch incremental sobre a base v48 enviada, com inclusão da correção manual de tipo `datajudTimeoutMs` instruída na conversa. Sem migrations e sem alteração no catálogo comercial, nas assinaturas, no banco ou no agendamento.

## Diagnóstico da captura real (relato do ambiente Windows)
`[datajud.lookup] { mode:'preview', court:'tjsp', code:'PROCESS_LOOKUP_TIMEOUT', stage:'connect', elapsedMs:45013, timeoutMs:45000, upstreamTookMs:null, upstreamStatus:undefined }` mostra que **nenhum status HTTP chegou ao fetch até o abort de 45 segundos**. O nome antigo `connect` era excessivamente específico: o `fetch()` pode estar esperando DNS, TCP, TLS ou cabeçalhos HTTP. O log **não prova** indisponibilidade do cluster DataJud nem problema dos campos do processo. Mais tempo/menos `_source` não resolveu a falha observada.

Fonte oficial de host/endpoint: `https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search`, conforme a wiki do CNJ. Não alterar o host por adivinhação.

### Ferramentas e caminho de resolução

1. `npm run diagnose:datajud:network` (não usa CNJ, chave nem banco). Inspeciona DNS, TCP IPv4/IPv6 e negociação TLS IPv4. A saída contém apenas estados/códigos de rede.
2. **Somente se TCP/TLS IPv4 passarem e IPv6 falhar**, no `.env.local` de desenvolvimento definir `DATAJUD_FORCE_IPV4=true`, reiniciar `npm run dev` e testar a mesma consulta. Esse modo usa `node:https` restrito ao host oficial com `family:4`; o `fetch` normal é preservado por padrão. Não habilitar indiscriminadamente em produção.
3. Se ambos os caminhos falharem, testar de outra rede e investigar DNS/firewall/proxy/roteamento antes de modificar o backend. Se TCP/TLS passarem, mas a consulta HTTP continuar sem cabeçalhos, executar o diagnóstico existente `npm run diagnose:datajud -- <CNJ_PUBLICO>`; investigar disponibilidade, proxy, bloqueio do endpoint, API e status (não expor a chave ou o CNJ no chat).
4. Nenhum aumento adicional de timeout. Controle de erro preserva publicações, prazo e cadastro manual; saída de debug altera `stage` de `connect` para `headers` e fornece `networkCode` técnico limitado se a pilha expuser código.

**A consulta não foi homologada.** Não houve conexão real com a rede ou o banco Windows do usuário neste ambiente. O modo IPv4 é alternativa, não solução comprovada.

## Plano e cobrança (interface apenas)

- A página `/app/plano` continua com verificação de sessão e papel `owner` no servidor.
- Resumo real do `Subscription`: plano, `billingCycle`, `status`, `currentPeriodEnd`; contagem de processos por `organizationId`. Somente assinatura `active` com fim de período registrado pode mostrar próxima renovação; em outros estados exibir **Não registrada**. Quando não houver método associado à assinatura, exibir **Não registrado no Jurisportal**; schema atual não contém fonte de verdade para cartão/Pix/boleto contratado.
- Mensalidade/Anualidade mostra referência do catálogo, não preço cobrado pelo gateway; nenhum pagamento confirmado é inventado.
- `Alterar plano` abre diálogo com catálogo, anual/mensal, nível seguinte quando existir, confirmação para downgrade e confirmação reiterada. Upgrade avança para uma **prévia do pagamento**, nunca cobrança real. Escolha de Pix/boleto/cartão é somente visual; dados de cartão não são coletados.
- Downgrade com excesso identifica quantidade de processos existentes que excedem novo limite e avisa sobre exportação. **Não elimina, não arquiva, não modifica plano**. Antes do gateway será necessária decisão de produto sobre seleção/arquivo/remoção e sua compatibilidade com a regra atual que restringe exclusão permanente ao PLATFORM_MASTER, retenção e recuperação. Não apagar processo de cliente por redução de plano sem política implementada e homologada.
- Área de créditos exibe cota **planejada** da especificação recente (0/0/100/500/2000/5000), mas não inventa saldo/consumo. Comprar créditos é desativado até ledger e preços reais. Não substituir o motor antigo de limites de IA por valores apenas visuais.
- Textos sobre Pix/boleto são estimativas, dependem do provedor; não são SLA de compensação.

## Testes e limitações

`npm run diagnose:datajud:network`, `npm run test:process-lookup`, `npm run typecheck`, `npm run build`; teste visual em desktop e 390px. `tsx --test src/modules/plans/domain/plan-change-preview.test.ts` cobre classificação de upgrade/downgrade sem exclusão.

Código foi auditado estaticamente e verificado para erros sintáticos TS/TSX. Não foi possível homologar consulta externa nem `typecheck` e `build` completos neste ambiente por dependências npm indisponíveis. Não marcar como validado até os testes locais e diagnóstico da rede retornarem.

## Itens pós-visual

Conectar método realmente registrado, faturas, valor contratado, vencimento/renovação e confirmação de pagamento por webhooks idempotentes do provedor; créditos com ledger, saldos e compras; processo de downgrade com exportação e escolha explícita de excedentes e retenção; testes reais de rede/timeout, cross-tenant e simulação de indisponibilidade.
