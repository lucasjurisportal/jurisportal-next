# ADR-009 — Cliente unificado e arquivamento lógico

## Status
Aceito.

## Decisão
Pessoa física e pessoa jurídica compartilham a entidade `Client`, distinguida por `kind = PF | PJ`.

Não usamos tabelas independentes `PessoaFisica` e `PessoaJuridica` porque endereço, contato, vínculo com processos, financeiro, documentos, busca, auditoria e isolamento por organização são essencialmente os mesmos.

## Documento
O valor digitado é preservado em `taxIdRaw` e a forma apenas com dígitos é mantida em `taxIdNormalized`. A unicidade é `(organizationId, taxIdNormalized)`.

## Exclusão
Clientes não são apagados no fluxo normal. `status = ARCHIVED` e `archivedAt` preservam o histórico.

## Multi-tenancy
Toda consulta contém `organizationId`. Nunca aceitar organização enviada pelo formulário do cliente.

## Consequência
O módulo Processos poderá referenciar `Client.id` sem duplicar nome, CPF/CNPJ ou contato em cada processo.
