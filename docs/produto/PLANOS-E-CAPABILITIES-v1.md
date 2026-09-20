# Planos e capabilities v1

## Fonte de verdade

Os valores usados pelo sistema ficam em:

`src/modules/plans/domain/plan.catalog.ts`

Não duplicar preço em Landing, Cadastro, Cobrança ou backend.

## Período promocional

Promoção válida até 30/06/2027 no horário de São Paulo.

| Plano | Promocional | Regular |
|---|---:|---:|
| Essencial | R$ 79,99 | R$ 99,99 |
| Estratégico | R$ 129,00 | R$ 179,00 |
| Premium | R$ 179,00 | R$ 249,00 |
| Executivo | R$ 349,00 | R$ 449,00 |
| Alta Corte | R$ 550,00 | R$ 750,00 |

Regra anual inicial: cobrança equivalente a 10 mensalidades para 12 meses de uso, aproximadamente 16,67% de desconto.

## Filosofia de progressão

### Free
Experimentar a organização básica. Não deve substituir o produto pago.

### Essencial
Porta de entrada do advogado solo. Deve resolver organização e automações jurídicas essenciais sem IA.

### Estratégico
Plano intermediário confortável. Mais usuários/OABs, equipe, auditoria e fluxo melhor de Publicações e Intimações. Não possui IA.

### Premium
Primeiro plano com IA. A partir daqui o sistema começa a interpretar e resumir informações controladas.

### Executivo
Automação e comunicação mais amplas, maior volume e preparação para WhatsApp/Google Calendar conforme as integrações forem ativadas.

### Alta Corte
Maior capacidade, prioridade e integrações avançadas quando validadas.

## Regra da IA

IA começa exclusivamente no Premium.

Limites internos iniciais, não necessariamente exibidos na Landing:

| Plano | Unidades internas/mês |
|---|---:|
| Free | 0 |
| Essencial | 0 |
| Estratégico | 0 |
| Premium | 500 |
| Executivo | 2.500 |
| Alta Corte | 10.000 |

Pesos atuais:

- resumo de publicação: 1 unidade;
- localizar data expressa: 1 unidade;
- resumo para cliente: 3 unidades;
- resumo de gestão: 2 unidades.

Esses limites existem para proteção de custo. Devem ser medidos e recalibrados com uso real antes de qualquer promessa pública de volume.

## Regra de promessa comercial

Uma capability pode existir internamente sem aparecer na Landing.

Só anunciar como disponível quando:

1. estiver implementada;
2. tiver teste do fluxo principal;
3. tiver tratamento de erro;
4. estiver documentada;
5. dependência externa necessária estiver aprovada/ativa.

## Capacidade de clientes e processos

Clientes são ilimitados nos planos pagos. O Free permanece limitado a 10 clientes para experimentação.

Processos são controlados comercialmente porque concentram histórico, monitoramento e futuras integrações de custo variável:

| Plano | Clientes | Processos |
|---|---:|---:|
| Free | 10 | 10 |
| Essencial | Ilimitados | 100 |
| Estratégico | Ilimitados | 250 |
| Premium | Ilimitados | 500 |
| Executivo | Ilimitados | 1.000 |
| Alta Corte | Ilimitados | 2.000 |

Encerrar ou arquivar processo não libera a capacidade automaticamente.

## Armazenamento de documentos

A quota comercial de armazenamento é independente dos limites de clientes e processos:

| Plano | Armazenamento incluído |
|---|---:|
| Free | 1 GB |
| Essencial | 10 GB |
| Estratégico | 20 GB |
| Premium | 50 GB |
| Executivo | 100 GB |
| Alta Corte | 200 GB |

Armazenamento adicional poderá ser vendido separadamente. O módulo Documentos deve usar esta quota como fonte de verdade, incluindo uploads individuais, ZIPs descompactados, migração de outro sistema e futuras importações dos autos.
