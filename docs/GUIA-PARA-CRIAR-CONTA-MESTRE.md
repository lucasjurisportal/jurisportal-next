# Como criar a conta mestre

1. Rode a migration v27.
2. Inicie o sistema.
3. Cadastre sua conta normalmente e confirme o e-mail.
4. Pare o servidor ou abra outro terminal na raiz do projeto.
5. Execute:

```powershell
npm run admin:promote -- seu-email@dominio.com
```

6. Entre por `/admin/login` com a senha que você mesmo criou.

O comando nunca pede nem grava senha. Ele apenas promove um usuário já existente e verificado.
