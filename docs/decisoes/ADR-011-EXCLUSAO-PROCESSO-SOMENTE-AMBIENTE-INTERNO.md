# ADR-011 — Exclusão permanente de processo somente no ambiente interno

## Decisão
Processos de escritórios clientes não possuem exclusão permanente no fluxo normal. Eles podem ser encerrados, arquivados ou reativados.

A exclusão física existe exclusivamente para limpeza de testes quando **as duas condições** forem verdadeiras:

1. usuário autenticado é `PLATFORM_MASTER` ativo;
2. organização ativa tem slug `jurisportal-internal`.

A autorização é validada novamente no backend. Esconder o botão na interface não é considerado segurança.

## Motivo
Processos formam histórico jurídico e futuramente terão publicações, prazos, documentos, financeiro e auditoria vinculados. Permitir exclusão normal facilitaria perda de histórico e também permitiria contornar limites comerciais de processos.

O ambiente `Jurisportal Internal`, por outro lado, precisa ser limpo durante desenvolvimento e homologação.

## Auditoria
Antes da exclusão é criado `audit_event` com a ação `process.deleted_permanently`, identificador do processo, últimos 4 dígitos do CNJ e status anterior. Dados pessoais das partes não são copiados para o log.

## Regra futura
Se algum dia for necessária correção excepcional em produção, ela deve ser uma operação administrativa separada, justificada e auditada. Esta permissão interna não deve ser ampliada para escritórios clientes.
