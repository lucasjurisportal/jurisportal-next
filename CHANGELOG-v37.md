# Jurisportal Next v37 — Configurações e importação assistida

## Configurações

- `/app/configuracoes` funcional.
- Conta e telefone editáveis pelo próprio usuário.
- Alteração de senha com encerramento das outras sessões.
- Encerramento manual das demais sessões do usuário.
- Dados do escritório editáveis apenas pelo proprietário.
- OABs e consumo do plano visíveis ao proprietário sem permitir troca livre de OAB.
- Preferências administrativas de notificações persistidas.
- Desativar relatório diário por e-mail passa a interromper o envio real pelo cron.
- Preferência de tamanho de texto persistida no navegador e aplicada ao AppShell.

## Importação assistida

- Importação de clientes e processos por CSV/XLSX.
- Importação restrita ao proprietário no frontend e backend.
- Reconhecimento automático e remapeamento manual de colunas.
- Dry-run obrigatório sem gravação.
- Classificação por linha: pronta, duplicada, inválida ou acima do limite do plano.
- Modelos CSV para clientes e processos.
- Clientes validados pelas regras reais do módulo Clientes.
- Processos vinculados a clientes por CPF/CNPJ e responsável por e-mail da equipe.
- CNJ validado e bloqueado somente após confirmação.
- Referência interna criada pelo Jurisportal.
- Origem `IMPORT` em auditoria/processo.
- Arquivo original não armazenado no PostgreSQL.
- Limite inicial de 4 MB e 1.000 linhas por arquivo.
- Cabeçalhos semanticamente duplicados são rejeitados.

## Arquitetura

- nenhuma migration nova;
- nova dependência `read-excel-file@9.3.10` para `.xlsx`;
- parser CSV interno;
- documentação em `docs/blocos/30-configuracoes-importacao-funcional.md`;
- ADR-024 documenta a decisão de não criar bypass de domínio.
