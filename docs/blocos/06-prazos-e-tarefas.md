# Prazos e Tarefas

## Objetivo
Controlar tudo que precisa ser cumprido, por quem e até quando, sem espalhar a rotina jurídica em telas diferentes.

## Visões
- Todos
- Atrasados
- Hoje
- Próximos
- Fatais
- Minhas tarefas
- Delegadas por mim
- Concluídas

## Filtros
- Busca por título, processo, cliente ou responsável
- Responsável
- Tipo: prazo ou tarefa

## Novo prazo
Campos principais:
- título
- processo vinculado
- data
- horário opcional
- responsável
- prioridade
- identificação de prazo fatal
- observações

## Nova tarefa
Campos principais:
- título
- processo opcional
- responsável
- prazo
- prioridade
- lembrete
- detalhes

## Integração com Agenda
Todo prazo com data e toda tarefa com data devem aparecer na Agenda do responsável.

## Integração futura com Google Calendar
Quando o usuário autorizar, eventos relevantes poderão ser sincronizados com o Google Calendar individual.

## Publicações e intimações
Uma publicação ou intimação poderá gerar prazo ou tarefa.

- Se a fonte trouxer uma data expressa para manifestação ou cumprimento, essa data poderá ser usada como data do compromisso.
- Se a data depender de interpretação, inferência ou cálculo por IA, a confirmação humana será obrigatória antes de virar prazo jurídico definitivo.
- A origem do prazo deve permanecer registrada.

## Conclusão e auditoria
Concluir um prazo ou tarefa não apaga o registro. Devem ser preservados:
- responsável
- criador
- origem
- datas
- alterações
- data e hora de conclusão

## Permissões
A matriz detalhada será fechada depois da modelagem das demais páginas, mas a arquitetura deverá suportar permissões granulares de criação, edição, conclusão e delegação.


## Edição
- Tarefas podem ser editadas enquanto não estiverem concluídas.
- A edição de prazos jurídicos será tratada com regra própria e auditoria mais rígida na implementação funcional.
- Alterações devem preservar valor anterior, usuário, data e hora.
