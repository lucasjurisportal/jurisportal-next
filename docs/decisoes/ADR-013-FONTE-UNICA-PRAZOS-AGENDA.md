# ADR-013 — Fonte única para Prazos, Tarefas e Agenda

## Status
Aceita.

## Contexto
O mesmo prazo precisa aparecer no processo, na página global e na Agenda. Criar três registros separados produziria divergência e código de sincronização desnecessário.

## Decisão
`ProcessWorkItem` é a entidade única de prazo/tarefa.
A Agenda projeta os itens datados dessa tabela.
`AgendaEvent` existe somente para eventos que não são prazo/tarefa, inicialmente audiência e compromisso.

## Consequências
- não há cópia de prazo na Agenda;
- conclusão em qualquer ponto reflete em todo o sistema;
- criação global exige processo e atualiza linha do tempo;
- tarefa sem data não aparece na Agenda;
- futura publicação criará/referenciará o mesmo tipo de item, sem inventar outro modelo.
