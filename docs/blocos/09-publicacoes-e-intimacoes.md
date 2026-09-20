# Publicações e Intimações

## Objetivo
Centralizar comunicações encontradas para as OABs monitoradas e transformá-las em ação operacional vinculada ao processo.

## Fonte inicial
DJeN.

## Janelas de consulta
- 06:00
- 12:00
- 18:00

Não haverá botão de consulta manual irrestrita nesta fase.

## Visões
- Todas
- Novas
- Não tratadas
- Tratadas
- Com data expressa

## Filtros
- busca textual
- OAB
- responsável
- tipo: publicação/intimação

## Dados exibidos
- tipo
- status
- processo
- partes
- trecho da comunicação
- OAB monitorada
- responsável
- origem
- vínculo com processo
- data expressa, quando existir

## Ações
- abrir
- criar tarefa
- criar prazo
- vincular processo
- marcar como tratada

## Vínculo com Processo
Sempre que o processo já existir no Jurisportal, a publicação/intimação deve ser vinculada a ele e registrada na linha do tempo.

Quando o processo não for identificado:
- sinalizar claramente
- permitir buscar processo existente
- permitir cadastrar/importar o processo posteriormente

## Prazos
Se a própria comunicação contiver data expressa, ela pode ser usada para pré-preencher um novo prazo.

Quando a data depender de inferência, interpretação ou cálculo por IA, a confirmação humana será obrigatória antes de criar prazo jurídico definitivo.

## Notificações
Novidades poderão ser enviadas por:
- e-mail
- WhatsApp

A configuração de canais pertence às Configurações do usuário/escritório.

## Auditoria
Registrar:
- origem
- data/hora de captura
- OAB correspondente
- usuário que tratou
- ação tomada
- prazo/tarefa gerados
- vínculo com processo

## Estados de carregamento e segurança
As rotinas assíncronas devem possuir:
- loading
- estado de erro
- reprocessamento controlado
- idempotência
- proteção contra duplicidade
## Estado de implementação v33
O núcleo funcional desta especificação foi implementado na v33. A captura automática de produção nos horários 06:00, 12:00 e 18:00 permanece dependente do scheduler do ambiente de deploy. A consulta manual existente é restrita a desenvolvimento/PLATFORM_MASTER e serve apenas para validação. E-mail e WhatsApp permanecem desacoplados da captura e serão implementados em blocos próprios.

