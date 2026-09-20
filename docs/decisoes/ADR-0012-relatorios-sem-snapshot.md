# ADR-0012 — Relatórios calculados sobre dados operacionais

## Status

Aceito.

## Contexto

O Jurisportal já possui dados de clientes, processos, prazos/tarefas, publicações, financeiro e auditoria. Criar uma segunda base de relatórios agora adicionaria sincronização, migrations, risco de divergência e custo de manutenção antes do beta.

## Decisão

A primeira versão de Relatórios consulta diretamente as tabelas operacionais do tenant e calcula agregações sob demanda.

Não serão criadas nesta fase:

- tabelas de snapshot;
- data warehouse;
- jobs de agregação;
- microserviço de analytics;
- duplicação de prazos ou financeiro.

As consultas são limitadas e executadas em paralelo quando independentes.

## Consequências

Vantagens:

- dados do relatório refletem a fonte real;
- nenhuma migration necessária;
- menor risco de divergência;
- entrega mais rápida para demonstração e beta.

Limitação:

- com crescimento expressivo da base, algumas agregações poderão precisar de índices adicionais, cache ou snapshots. Essa decisão deverá ser tomada com medição real de performance, não antecipadamente.
