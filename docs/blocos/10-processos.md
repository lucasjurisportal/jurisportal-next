# Processos

## Objetivo
Ser o núcleo operacional do Jurisportal. Cada processo concentra dados processuais, partes, cliente(s), publicações, prazos, tarefas, documentos, financeiro jurídico e auditoria.

## Lista principal
Visões:
- Todos
- Ativos
- Encerrados
- Arquivados
- Encontrados

Busca:
- número CNJ
- cliente
- parte
- assunto

Filtros iniciais:
- responsável
- tribunal
- movimentação recente / sem movimento há mais de 30 dias

Paginação:
- 10 processos por página na versão funcional

## Cadastro manual
Cadastro mínimo:
- número CNJ
- cliente
- responsável

Quando a fonte permitir, o backend tenta obter automaticamente:
- tribunal
- vara
- comarca
- classe
- assunto
- partes
- distribuição

O usuário só complementa o que não puder ser descoberto.

## Página do processo
Abas:
- Visão geral
- Linha do tempo
- Publicações
- Prazos e tarefas
- Documentos
- Financeiro
- Histórico

## Partes e clientes
As partes são entidades processuais dinâmicas.
Um processo pode possuir vários clientes representados.
O advogado define qual parte é cliente do escritório.

## Linha do tempo
Unifica eventos de diferentes origens:
- movimentação judicial
- publicação/intimação
- prazo
- tarefa
- documento
- observação
- alteração relevante
- evento manual

## Publicações
Mostra apenas comunicações vinculadas ao processo e permite abrir a central completa quando necessário.

## Prazos e tarefas
Itens criados dentro do processo também aparecem nos módulos Prazos e Tarefas e Agenda.

## Documentos
Documentos pertencem ao processo por referência e ficam em armazenamento de objetos, não como blobs no banco relacional.

Requisitos:
- loading/progresso
- validação
- idempotência
- prevenção de upload duplicado
- origem e auditoria

## Financeiro jurídico
O financeiro principal fica dentro do processo.

Pode conter:
- honorário estimado
- honorário contratado
- honorário recebido
- honorário a receber
- custas
- despesas
- reembolsos
- comprovantes

O valor estimado e o valor contratado são conceitos diferentes.
Mudança no valor da causa não deve alterar automaticamente um honorário histórico já contratado.

O Jurisportal não será ERP contábil.
A consolidação entre processos fica em Relatórios.

## Captura Automática por OAB
A captura descobre processos ativos relacionados às OABs monitoradas.

Se encontrar mais processos que o limite disponível:
- não importar aleatoriamente
- apresentar os encontrados
- usuário escolhe quais monitorar
- permitir upgrade/add-on no futuro
- excesso pode permanecer em estado Encontrado

## Cotas
Processos cadastrados e processos monitorados são contagens separadas.
Arquivar ou excluir logicamente um processo não deve liberar vaga automaticamente sem regra comercial explícita.

## Exclusão
Não haverá exclusão destrutiva normal.
Estados previstos:
- ativo
- encerrado
- arquivado
- cancelado por erro / excluído logicamente

## Auditoria
Alterações relevantes registram:
- usuário
- data/hora
- valor anterior
- novo valor
- origem da alteração
