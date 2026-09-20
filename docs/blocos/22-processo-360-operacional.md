# Bloco 22 — Processo 360 operacional

## Objetivo
Transformar a página de Processo em um workspace real, sem depender de integrações pagas.

## O que funciona nesta versão
- Visão geral do processo e partes/clientes vinculados.
- Linha do tempo real com eventos do sistema e evento manual.
- Prazos e tarefas vinculados ao processo.
- Conclusão e reabertura de prazo/tarefa sem apagar histórico.
- Financeiro jurídico por processo: contrato de honorários e lançamentos.
- Histórico de auditoria do processo.
- Abas reservadas para Publicações/DJeN e Documentos, sem dados fictícios.

## O que deliberadamente ainda não está pronto
### Publicações e intimações
A aba existe como ponto de integração, mas o pipeline DJeN será implementado no próximo bloco. Não inventar publicações em banco para preencher a tela.

### Documentos
A aba existe, porém upload só será ativado depois da configuração de object storage privado. Arquivos jurídicos não devem ser gravados como BLOB no PostgreSQL nem no disco local da aplicação.

## Modelos de dados
### process_work_item
Representa prazo ou tarefa. Campos principais:
- `organizationId`
- `processId`
- `kind`: DEADLINE/TASK
- `dueDate`: DATE, propositalmente sem horário/fuso
- `dueTime`: HH:mm textual opcional
- `responsibleUserId`
- `priority`
- `isFatal`
- `status`: OPEN/DONE
- `origin`: MANUAL inicialmente

A futura integração DJeN poderá criar um item em estado de revisão, mas não deve transformar sugestão de IA em prazo jurídico definitivo sem confirmação humana.

### process_fee_agreement
Resumo do contrato de honorários daquele caso. Não é um ERP contábil.

### process_finance_entry
Lançamentos de honorários recebidos, custas/despesas e reembolsos.

## Regras importantes
1. Todo registro carrega `organizationId`.
2. Toda gravação valida também `processId` dentro da organização atual.
3. Alterações relevantes geram `audit_event` com `entityType=process` e `entityId` do processo.
4. Criar/concluir prazo ou tarefa também gera evento na linha do tempo.
5. Financeiro do processo não substitui contabilidade.
6. Não apagar prazo/tarefa concluído apenas para “limpar a tela”. Histórico deve permanecer.

## Rotas
- `POST /api/processes/:id/timeline`
- `POST /api/processes/:id/work-items`
- `PATCH /api/processes/:id/work-items/:workItemId`
- `PUT /api/processes/:id/finance/agreement`
- `POST /api/processes/:id/finance/entries`

## Próximos passos
1. DJeN/publicações reais.
2. Transformação de publicação em revisão de prazo/tarefa.
3. Agenda consumindo os mesmos `process_work_item`.
4. Object storage e documentos.
5. Tela consolidada de Prazos e Tarefas fora do processo.
