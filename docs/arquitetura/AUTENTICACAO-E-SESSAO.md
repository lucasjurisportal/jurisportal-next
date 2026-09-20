# Autenticação e sessão

## Regra simples
Frontend nunca decide se alguém tem acesso. O servidor decide.

## Caminho
Browser -> `/api/auth/*` -> Better Auth -> Prisma -> PostgreSQL.

## Proteção da aplicação
`src/app/app/layout.tsx` é a primeira barreira de todas as páginas internas. Ele valida a sessão e procura uma membership real. APIs e Server Actions futuras também devem repetir a validação apropriada; o layout não substitui autorização em endpoints.

## Segredos
- `BETTER_AUTH_SECRET`: assinatura/criptografia da autenticação.
- `DATABASE_URL`: conexão runtime.
- `DIRECT_URL`: migrations/administração.

Nunca prefixar esses segredos com `NEXT_PUBLIC_`.
