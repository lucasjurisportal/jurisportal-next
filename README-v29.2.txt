Jurisportal Next v29.2 — exclusão controlada de processos

Este patch deve ser aplicado sobre a v29 + correção v29.1.

Não há migration nova e não é necessário db:deploy.

Depois de substituir os arquivos:
  npm run typecheck
  npm run test:processes
  npm run dev

Teste como PLATFORM_MASTER dentro de Jurisportal Internal:
  Processo > detalhe > Excluir processo permanentemente

Em qualquer organização de cliente, o botão não deve existir e a API DELETE retorna 403 mesmo se chamada manualmente.
