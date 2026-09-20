# Bloco 14 — Banco Supabase + Prisma

## Objetivo
Transformar o Jurisportal de protótipo em aplicação capaz de persistir dados em PostgreSQL na nuvem.

## Arquivos principais
- `prisma/schema.prisma`: contrato do banco.
- `prisma.config.ts`: configuração do Prisma CLI e migrations.
- `src/infrastructure/database/prisma.ts`: cliente compartilhado usado pelo backend.
- `src/app/api/health/database/route.ts`: teste simples de conectividade.

## Primeiros modelos preparados
- `User`, `Session`, `Account`, `Verification`: base de autenticação compatível com a futura integração do Better Auth.
- `Organization`, `Member`, `Invitation`: fundação multi-tenant/escritórios.
- `Subscription`: plano contratado e estado comercial.
- `AuditEvent`: trilha de auditoria.

## O que NÃO foi feito ainda
- Nenhuma migration foi aplicada no Supabase.
- Better Auth ainda não foi ligado.
- Nenhum usuário real foi criado.
- Nenhuma política RLS específica de tenant foi criada.

## Teste de conectividade
Depois de instalar dependências e gerar o Prisma Client, iniciar `npm run dev` e abrir:

`http://localhost:3000/api/health/database`

Sucesso esperado:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Este endpoint não cria, edita ou apaga dados. Ele executa apenas `SELECT NOW()`.

## Próximo passo após o teste
Criar e revisar a migration `foundation`, aplicar no banco de desenvolvimento e depois integrar autenticação real.
