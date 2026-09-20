# Bloco 18 — Clientes funcional

## Objetivo
Substituir a antiga tela demonstrativa de Clientes por um módulo persistente, multi-tenant e auditado.

## O que existe nesta versão
- PF e PJ na mesma entidade de domínio.
- CPF/CNPJ obrigatórios, normalizados e validados no backend.
- Duplicidade impedida dentro do mesmo escritório.
- Busca por nome, documento, telefone e e-mail.
- Filtros por PF/PJ, status e UF.
- Paginação fixa de 10 registros.
- Criação e edição.
- Arquivamento lógico e restauração.
- CEP via adaptador HTTP interno para ViaCEP, com fallback manual.
- Limite de clientes aplicado pelo catálogo de planos.
- Auditoria de criação, alteração, arquivamento e restauração.
- `organizationId` obrigatório em toda consulta e mutação.

## Regra de limite
O Free possui 10 vagas de cliente. Arquivar não libera uma vaga: o registro continua existindo e pode possuir histórico ou vínculos futuros. Planos pagos usam limite comercial `unlimited` nesta versão.

## Segurança
A API nunca aceita `organizationId` vindo do navegador. A organização é obtida da sessão autenticada e do workspace ativo no servidor.

A tabela `client` possui RLS habilitado como segunda barreira. A autorização principal continua sendo feita pelo backend.

## Exclusão
Não existe DELETE de cliente na API pública do produto. O fluxo normal é arquivar. Isso preserva auditoria e evita quebrar futuros vínculos com processos, documentos e financeiro.

## Relações futuras
Quando Processos entrar, será criada relação muitos-para-muitos entre processo e clientes representados. A lista já reserva a coluna "Processos", que nesta versão apresenta zero porque esse relacionamento ainda não existe.

## Arquivos principais
- `src/modules/clients/domain/client.schema.ts`
- `src/modules/clients/domain/tax-id.ts`
- `src/modules/clients/application/client-service.ts`
- `src/app/api/clients/route.ts`
- `src/app/api/clients/[id]/route.ts`
- `src/app/app/clientes/page.tsx`
- `src/components/clients/ClientForm.tsx`
- `prisma/migrations/20260915213000_clients/migration.sql`
