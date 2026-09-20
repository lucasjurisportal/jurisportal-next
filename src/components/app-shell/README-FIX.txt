Jurisportal Next v28.2 - correção do menu ativo

Problema corrigido:
- Dashboard ficava visualmente selecionado em todas as rotas.

Correção:
- AppShell agora usa usePathname() para marcar como ativo o módulo correspondente à URL atual.
- Funciona também em subrotas, por exemplo /app/clientes/novo e /app/clientes/[id]/editar.
- Configurações e Plano e cobrança também passam a refletir corretamente a rota ativa.

Substitua somente:
src/components/app-shell/AppShell.tsx

Não precisa rodar migration, npm install ou db:deploy.
Depois execute npm run typecheck e reinicie npm run dev se necessário.
