# Bloco 23 — Prazos, Tarefas e Agenda funcional

## Objetivo
Transformar as telas antes visuais de Prazos/Tarefas e Agenda em módulos reais, persistentes e integrados ao processo.

## Regra principal: uma única fonte de verdade
Prazos e tarefas são armazenados somente em `process_work_item`.

Eles podem ser criados:
- dentro do processo;
- na página global `/app/prazos`.

Em ambos os casos é o mesmo registro. Não existe cópia para a Agenda.

A Agenda consulta:
1. `process_work_item` quando existe `dueDate`;
2. `agenda_event` para audiências e compromissos.

Isso evita o problema clássico de uma data ser alterada em uma tela e continuar antiga em outra.

## Fluxos implementados

### Processo → prazo/tarefa
1. Usuário abre o processo.
2. Cria prazo ou tarefa.
3. Registro entra em `process_work_item`.
4. Aparece imediatamente na aba do processo.
5. Aparece na página global Prazos e tarefas.
6. Se possuir data, aparece na Agenda.

### Prazos e tarefas → processo
1. Usuário abre `/app/prazos`.
2. Seleciona o processo obrigatório.
3. Cria prazo ou tarefa.
4. O serviço reutiliza a mesma regra de criação do processo.
5. Linha do tempo e auditoria do processo são atualizadas.
6. O item aparece dentro do processo e na Agenda, quando datado.

### Agenda
- `DEADLINE` e `TASK` vêm de `process_work_item`.
- `HEARING` e `COMMITMENT` vêm de `agenda_event`.
- Audiência/compromisso pode ter processo opcional.
- Se tiver processo, a criação também gera evento na linha do tempo.

## Edição
- Tarefa pode ser editada na tela global.
- Prazo jurídico não recebe edição simples nesta versão.
- Alteração futura de prazo deverá preservar valor anterior, autor, data/hora e justificativa.

## Views de Prazos e Tarefas
- Todos
- Atrasados
- Hoje
- Próximos
- Fatais
- Minhas tarefas
- Delegadas por mim
- Concluídas

## Agenda
Views:
- Hoje
- Semana
- Mês

Filtro atual:
- responsável
- data âncora

## Datas
Datas jurídicas são `DATE`, não timestamps, para evitar alteração acidental por fuso horário.
A definição de "hoje" operacional usa `America/Sao_Paulo`.

## Arquivos principais
- `src/modules/work-items/domain/work-item.schema.ts`
- `src/modules/work-items/application/work-item-service.ts`
- `src/app/app/prazos/page.tsx`
- `src/app/api/work-items/*`
- `src/modules/agenda/domain/agenda-event.schema.ts`
- `src/modules/agenda/application/agenda-service.ts`
- `src/app/app/agenda/page.tsx`
- `src/app/api/agenda-events/route.ts`

## Banco
Nova tabela:
- `agenda_event`

Tabela reutilizada:
- `process_work_item`

## Testes manuais obrigatórios
1. Criar prazo dentro de um processo.
2. Confirmar que aparece em `/app/prazos`.
3. Confirmar que aparece em `/app/agenda` na data correta.
4. Criar tarefa global vinculada a um processo.
5. Confirmar que aparece na aba do processo.
6. Editar a tarefa global e verificar persistência.
7. Concluir/reabrir o item em uma tela e confirmar o novo estado nas demais.
8. Criar audiência com processo e verificar linha do tempo.

## Evoluções futuras
- prazo vindo de publicação/intimação;
- estado `PENDING_REVIEW` para prazo ainda não confirmado pelo advogado;
- lembretes;
- Google Calendar;
- edição jurídica auditada de prazo;
- audiências importadas de fornecedor externo.
