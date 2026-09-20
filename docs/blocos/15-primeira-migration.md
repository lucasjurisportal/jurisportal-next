# Bloco 15 - Primeira migration do PostgreSQL

## Objetivo
Criar no banco de desenvolvimento a fundação que permitirá autenticação e multi-tenancy reais.

## Tabelas criadas
- `user`: identidade do usuário.
- `session`: sessões autenticadas.
- `account`: método de autenticação/senha/provedor.
- `verification`: tokens temporários.
- `organization`: escritório jurídico (tenant).
- `member`: vínculo usuário ↔ escritório.
- `invitation`: convites de equipe.
- `subscription`: estado comercial do plano do escritório.
- `audit_event`: trilha append-only de eventos relevantes.

## O que NÃO existe ainda
Clientes, processos, OABs monitoradas, publicações, prazos, agenda e documentos ainda não são criados por esta migration.

## Como aplicar
No banco de desenvolvimento, com `.env.local` configurado:

```powershell
npm run db:deploy
```

Depois:

```powershell
npm run db:status
```

A aplicação usa `DATABASE_URL`; migrations usam `DIRECT_URL` via `prisma.config.ts`.

## Por que usamos migrate deploy nesta etapa
A migration está versionada e revisável no repositório. `migrate deploy` apenas aplica migrations pendentes e não depende do fluxo interativo/shadow database de `migrate dev`.

## RLS
RLS é explicitamente habilitado nas tabelas de tenant nesta migration, mas a política completa de runtime só será fechada junto da autenticação e do contexto de organização. Até lá, não considerar RLS como única barreira de segurança.

## Critério de pronto
1. `npm run db:deploy` termina sem erro.
2. `npm run db:status` informa que o schema está atualizado.
3. As nove tabelas aparecem no Supabase Table Editor.
4. Nenhum dado real de cliente foi inserido ainda.
