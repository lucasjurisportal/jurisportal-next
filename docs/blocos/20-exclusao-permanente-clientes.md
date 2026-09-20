# Bloco 20 — Exclusão permanente de clientes

## Objetivo

Permitir a remoção definitiva de um cadastro de cliente quando arquivar não for suficiente, sem transformar exclusão física na ação padrão do módulo.

## Regras

- Arquivamento continua sendo a opção recomendada para clientes que apenas deixaram de ser atendidos.
- Exclusão permanente é uma ação destrutiva separada e exige confirmação adicional na interface.
- Somente o `owner` da organização pode executar exclusão permanente.
- Toda consulta e exclusão continua limitada pelo `organizationId` da sessão atual.
- Antes de apagar o cadastro, o Jurisportal grava um evento de auditoria `client.deleted_permanently`.
- O evento de auditoria mantém somente metadados mínimos (`kind` e últimos quatro dígitos do CPF/CNPJ); nome, e-mail, telefone e endereço não são copiados para o log.
- A exclusão definitiva libera a capacidade ocupada pelo cliente no limite comercial do plano.

## Relações futuras

No v28.4 ainda não existem vínculos de `Client` com processos/documentos/financeiro. Ao introduzir essas relações, a exclusão permanente deve ser bloqueada quando houver registros jurídicos vinculados que precisem ser preservados. A política deve preferir `RESTRICT` no banco e validação explícita no domínio.

## API

`DELETE /api/clients/:id`

Respostas relevantes:

- `200`: cliente removido;
- `403 CLIENT_DELETE_FORBIDDEN`: membro atual não é proprietário;
- `404 CLIENT_NOT_FOUND`: cliente não pertence à organização ativa ou não existe;
- `500 CLIENT_DELETE_FAILED`: falha não esperada.

## Arquivos principais

- `src/modules/clients/application/client-service.ts`
- `src/app/api/clients/[id]/route.ts`
- `src/components/clients/ClientForm.tsx`
- `src/components/clients/Clients.module.css`
