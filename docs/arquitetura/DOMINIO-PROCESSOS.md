# Domínio Processos

## Relações

`Organization 1 -> N Process`

`Process N <-> N Client` por `ProcessClient`

`Process 1 -> N ProcessParty`

`Process 1 -> N ProcessTimelineEvent`

`User 1 -> N Process` como responsável opcional.

## Por que ProcessClient existe
Não copie nome/CPF/endereço do cliente para dentro do processo. O processo referencia o cadastro central. Isso evita divergência quando um cliente atualiza telefone ou endereço.

## Outras partes
Pessoas/empresas que não são clientes do escritório ficam em `ProcessParty`. O papel é texto flexível (`Autor`, `Réu`, `Reclamante`, `Terceiro`, etc.) porque os ritos variam.

## Multi-tenancy
Todas as tabelas do domínio carregam `organizationId`. Toda consulta de aplicação deve filtrar por organização mesmo existindo RLS.

## Integrações futuras
- DataJud/Jusbrasil/outro provedor: preencher capa/movimentações sem acoplar UI à fonte.
- DJeN: publicação se vincula ao processo pelo CNJ normalizado.
- OAB import: processo encontrado nasce com `source=OAB_IMPORT`/status apropriado e passa pelo mesmo domínio.

## v31 — Valor da causa, trabalho e Agenda

- `Process.caseValue` passa a guardar o valor da causa como `Decimal(14,2)`.
- Nesta fase o valor é manual; futura consulta externa poderá sugerir/preencher com origem registrada.
- `ProcessWorkItem` é a fonte única de prazo/tarefa para processo, tela global e Agenda.
- `AgendaEvent` não duplica prazos. Ele representa somente compromissos/audiências.
- Honorários percentuais usam o valor da causa no momento em que o contrato é salvo e persistem o total calculado como fotografia histórica.

## v33.1 — Identidade CNJ e referência interna

- `Process.cnjNormalized/cnjFormatted` continua sendo a identidade judicial oficial.
- Após a confirmação inicial, o CNJ é imutável para usuários normais do escritório.
- `Process.internalCode` é a referência operacional do escritório, gerada por organização e ano (`20260001`, `20260002`...).
- `ProcessNumberSequence` emite a sequência dentro da transação de criação para evitar colisão concorrente.
- Nomes de cliente/parte não fazem parte da identidade persistida. A UI monta dinamicamente rótulos como `20260001 - Cliente x Parte contrária`.
- Publicações DJeN com CNJ coincidente são ligadas automaticamente. Se a publicação tiver sido capturada antes do cadastro do processo, o vínculo é recuperado durante a criação do processo.
- Importadores futuros devem passar por staging e validação antes de criar o `Process`; após a confirmação, recebem a mesma referência interna e a mesma trava de CNJ.
