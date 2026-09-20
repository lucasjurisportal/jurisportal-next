Jurisportal Next v28.4 - Exclusão permanente de clientes

O que muda:
- Arquivar continua disponível e reversível.
- Excluir permanentemente passa a existir na edição do cliente.
- A exclusão exige uma segunda confirmação.
- Somente o proprietário (owner) do escritório pode excluir permanentemente.
- A ação é auditada antes da remoção, sem copiar dados pessoais completos para o log.
- Não há alteração de schema/banco nesta versão; não é necessário db:deploy.

Como aplicar:
1. Extraia este ZIP por cima da pasta atual do Jurisportal Next.
2. Preserve o .env.local.
3. Rode: npm run typecheck
4. Se passar, com npm run dev já ativo, teste em Clientes > Abrir / editar.

Importante para o próximo módulo:
Quando Cliente passar a ter vínculos com Processos/Documentos/Financeiro, a exclusão permanente será bloqueada enquanto existirem registros jurídicos que precisem ser preservados.
