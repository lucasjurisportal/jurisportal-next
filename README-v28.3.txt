Jurisportal Next v28.3 — patch de UX de Clientes e contexto PLATFORM_MASTER

Substitua/copiei os arquivos deste patch na raiz do projeto.
Não apaga .env.local e não exige migration.

Depois execute:
  npm run typecheck

Se passar:
  npm run dev

Testes:
1. /app/clientes/novo
   - enviar com campos inválidos e conferir destaque + mensagem por campo;
   - digitar CPF/CNPJ, WhatsApp, telefone e CEP e conferir máscara automática.
2. /admin
   - clicar "Abrir Jurisportal Internal" e conferir o nome do escritório no topo do app;
   - clicar "Sair da administração" e conferir retorno para /admin/login.
3. Fazer logout/login da conta PLATFORM_MASTER e confirmar que o ambiente padrão permanece Jurisportal Internal.

Não rode db:deploy: este patch não altera o schema do banco.
