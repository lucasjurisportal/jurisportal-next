# Bloco 17 — Segurança, 2FA e administração

## Objetivo
Adicionar uma segunda barreira de autenticação antes de qualquer dado jurídico real entrar no sistema.

## Fluxo de cadastro
1. Better Auth cria usuário e sessão.
2. Onboarding cria organização em estado `pending_verification`.
3. Jurisportal envia OTP por e-mail.
4. Usuário confirma o código.
5. `emailVerified=true`.
6. A mesma confirmação valida o segundo fator da sessão atual.
7. Free inicia os três meses somente nesse momento; planos pagos passam para `pending_payment`.

## Fluxo de login
1. E-mail + senha.
2. Se e-mail não foi confirmado, redireciona para confirmação.
3. Se o navegador possui `jp_trusted_device` válido, a sessão é liberada.
4. Caso contrário, envia OTP de login.
5. Código correto marca `session.secondFactorVerifiedAt`.
6. Se o usuário escolher lembrar o computador, é criado um dispositivo confiável por 15 dias.

## Política do OTP
- 5 caracteres alfanuméricos.
- Sem 0/O e 1/I.
- 10 minutos de validade.
- 60 segundos antes de reenviar.
- 5 tentativas.
- Código armazenado somente como HMAC-SHA256.
- Após cinco erros no `LOGIN_2FA`, `recoveryRequired=true`.

## Recuperação
A recuperação exige uma senha previamente aceita pelo Better Auth e um novo OTP entregue exclusivamente ao e-mail já verificado. Ela limpa o bloqueio do segundo fator.

## Trusted Device
O navegador recebe um token aleatório de 256 bits em cookie HttpOnly. O banco guarda somente SHA-256 do token. A validade é absoluta de 15 dias e não é renovada automaticamente a cada uso.

## SMS
A interface/porta existe, mas `sendOtpSms` está intencionalmente sem implementação. Não inventar gateway nem colocar credencial de SMS diretamente no módulo de autenticação. Quando houver fornecedor, criar um adapter em `src/modules/security/infrastructure`.

## Administração global
`PlatformAdmin` é separado de `Member`. Isso é obrigatório.

- `Member` responde: o que o usuário pode fazer dentro de um escritório.
- `PlatformAdmin` responde: quem pode administrar a plataforma Jurisportal.

Nunca usar `PLATFORM_MASTER` como atalho para remover `organizationId` de rotas comuns.
