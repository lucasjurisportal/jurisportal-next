# ADR-003 - Precificação promocional e regular

Status: aceito

## Decisão

Promoção válida até 30/06/2027 no horário de São Paulo.

| Plano | Promo | Regular |
|---|---:|---:|
| Essencial | R$ 79,99 | R$ 99,99 |
| Estratégico | R$ 129,00 | R$ 179,00 |
| Premium | R$ 179,00 | R$ 249,00 |
| Executivo | R$ 349,00 | R$ 449,00 |
| Alta Corte | R$ 550,00 | R$ 750,00 |

Plano anual-base cobra o equivalente a 10 mensalidades por 12 meses de uso (~16,67% de desconto).

## Implementação

A regra vive em `src/modules/plans/`. Landing, Cadastro e Cobrança devem consultar a mesma fonte, evitando divergência entre preço anunciado e preço cobrado.
