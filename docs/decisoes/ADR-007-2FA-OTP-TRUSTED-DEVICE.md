# ADR-007 — 2FA, OTP e dispositivo confiável

## Decisão
O Jurisportal usará senha + OTP como autenticação em duas etapas. O OTP é função interna do domínio de segurança e não fica acoplado ao fornecedor de e-mail.

## Motivos
- dados jurídicos e credenciais futuras exigem proteção superior a senha isolada;
- código de 5 caracteres é rápido para o usuário;
- cinco tentativas + expiração + rate limit reduzem força bruta;
- dispositivo confiável reduz atrito sem remover o segundo fator de novos acessos.

## Restrições
- validade do dispositivo é 15 dias, não 30;
- OTP nunca em texto puro no banco;
- SMS só entra quando existir fornecedor contratado;
- recuperação após bloqueio usa apenas o e-mail verificado.
