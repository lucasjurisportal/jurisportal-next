# ADR-014 — Valor da causa e honorários calculados

## Status
Aceita.

## Contexto
O processo precisava armazenar valor da causa. Honorários percentuais não devem exigir que o advogado calcule manualmente o resultado.

## Decisão
`Process.caseValue` guarda o valor atual da causa.
Nesta fase ele é informado manualmente; futura integração processual poderá preencher/atualizar a informação com indicação de fonte.

Modelos de honorários:
- FIXED: parcela fixa;
- PERCENTAGE: percentual do valor da causa;
- FIXED_PLUS_PERCENTAGE: parcela fixa + percentual do valor da causa;
- MANUAL: valor contratado informado diretamente.

O resultado calculado é salvo em `ProcessFeeAgreement.contractedAmount` como fotografia contratual.

## Regra de segurança financeira
Alterar posteriormente `caseValue` NÃO altera silenciosamente `contractedAmount`.
A interface mostra quanto o contrato ficaria se fosse salvo novamente. O usuário precisa confirmar a atualização.

## Fora desta etapa
- cobrança ao cliente;
- boleto/Pix/cartão;
- cobrança específica por recurso/ato;
- base percentual por proveito econômico/condenação;
- reajustes e parcelamento.
Esses itens entram no módulo financeiro/cobrança futuro.
