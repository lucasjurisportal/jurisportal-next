# Bloco 16 - Autenticação e onboarding real

## Objetivo
Transformar Login e Cadastro em fluxos reais, persistidos no PostgreSQL, sem acoplar dados jurídicos ao núcleo de autenticação.

## Componentes principais
- `src/infrastructure/auth/auth.ts`: configuração server-side do Better Auth.
- `src/infrastructure/auth/auth-client.ts`: cliente browser-side.
- `src/app/api/auth/[...all]/route.ts`: endpoints de autenticação.
- `src/app/api/onboarding/complete/route.ts`: finalização autenticada do primeiro escritório.
- `src/modules/onboarding/*`: validação e regra de criação do workspace.
- `src/app/app/layout.tsx`: proteção server-side de toda a área `/app`.
- `src/modules/organizations/application/get-current-workspace.ts`: resolve organização ativa e plano.

## Fluxo de cadastro
1. O navegador valida campos básicos.
2. Better Auth cria `user`, `account` e `session` usando e-mail/senha.
3. Com a sessão já autenticada, `/api/onboarding/complete` valida novamente os dados no servidor.
4. Uma única transação Prisma cria organização, proprietário, perfil, endereço, OAB, assinatura, aceites legais e auditoria.
5. A sessão recebe `activeOrganizationId`.
6. O usuário é redirecionado para `/app/dashboard`.

Se a etapa 2 funcionar e a etapa 4 falhar, a conta não é perdida. Ao tentar novamente com uma sessão autenticada, o onboarding pode ser retomado.

## Planos pagos antes do gateway
Enquanto o Asaas ainda não estiver integrado:
- Free: `subscription.status = trialing`.
- Plano pago selecionado: `subscription.status = pending_payment`.

Nunca trate `pending_payment` como assinatura ativa nas futuras verificações de capability.

## Segurança
- Senhas não são armazenadas pelo Jurisportal em texto puro. O Better Auth controla hashing e autenticação.
- `BETTER_AUTH_SECRET` fica exclusivamente no ambiente do servidor.
- Toda rota de negócio deve validar sessão no servidor, mesmo que a interface já esteja protegida.
- O layout `/app` valida sessão por banco antes de renderizar.
- UUID é obrigatório para IDs gerenciados pelo Better Auth neste projeto.
- RLS continua sendo defesa adicional; autorização do backend é obrigatória.

## Aceites legais
`legal_acceptance` é append-only no uso normal. Não sobrescrever aceites antigos. Quando Termos ou Privacidade mudarem materialmente, altere a versão em `legal-document-versions.ts` e solicite novo aceite quando aplicável.

## O que ainda não existe
- verificação de e-mail;
- recuperação de senha;
- convite real de membros por e-mail;
- pagamento Asaas;
- 2FA;
- autenticação social.

Essas ausências são intencionais no alpha e devem ser resolvidas antes de produção pública conforme o plano de entrega.
