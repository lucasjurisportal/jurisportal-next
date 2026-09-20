# ADR-012 — Processo como workspace central

## Status
Aceita.

## Contexto
O Jurisportal antigo distribuía informações do mesmo caso em telas independentes. No Next, o usuário deve abrir um processo e encontrar o contexto operacional daquele caso sem criar dezenas de páginas desconectadas.

## Decisão
A página do processo terá abas estáveis:
1. Visão geral
2. Linha do tempo
3. Publicações
4. Prazos e tarefas
5. Documentos
6. Financeiro
7. Histórico

As integrações e novos recursos devem crescer dentro dessas áreas sempre que fizer sentido, em vez de criar uma nova tela principal para cada pequena função.

## Consequências
- O número de processo é o agregador contextual, mas cada domínio mantém seu próprio serviço e tabela.
- Não colocar toda a regra em `process-service.ts`. Prazos/tarefas e financeiro usam serviços próprios.
- Publicações e documentos permanecem módulos separados e apenas se relacionam ao Processo.
- A página de processo pode compor vários serviços, mas não deve conter regra de negócio diretamente no JSX.
