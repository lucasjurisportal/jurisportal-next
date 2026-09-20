# Threat model simplificado — autenticação v1

## Segredos protegidos
- senha: responsabilidade do Better Auth;
- BETTER_AUTH_SECRET: somente ambiente do servidor;
- RESEND_API_KEY: somente ambiente do servidor;
- OTP: somente HMAC no banco;
- trusted device: token bruto somente no cookie HttpOnly, hash no banco.

## Ataques considerados
- força bruta de senha: rate limit do Better Auth;
- força bruta de OTP: cinco tentativas por desafio;
- reutilização de OTP: `consumedAt`;
- código velho após reenvio: desafio anterior é consumido;
- roubo do banco: OTP e trusted token não ficam em claro;
- bypass da UI: `/app` e `/admin` possuem guards server-side;
- abuso de conta mestre: papel global separado, 2FA e eventos de segurança.

## Pendências antes de produção
- rate limiting distribuído (não apenas processo local);
- CSP e headers de segurança finais;
- rotação/revogação de dispositivos confiáveis pela tela de Segurança;
- alerta ao usuário para novos logins/dispositivos;
- provedor SMS, caso seja aprovado comercialmente;
- revisão de sessões e duração do cookie do Better Auth.
