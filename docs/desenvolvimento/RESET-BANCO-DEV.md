# Limpeza segura do banco de desenvolvimento

Use:

```powershell
npm run dev:reset-data
```

O comando é bloqueado se `BETTER_AUTH_URL` não apontar para localhost/127.0.0.1.

Ele apaga dados de negócio e organizações/usuários de teste, mas preserva:
- usuário(s) `PLATFORM_MASTER` ativo(s);
- organização `Jurisportal Internal`;
- vínculo do administrador mestre com essa organização;
- assinatura interna.

Nesta versão, Clientes são limpos inclusive do escritório interno para permitir repetir testes do módulo.

Nunca use SQL `TRUNCATE` manual em produção.
