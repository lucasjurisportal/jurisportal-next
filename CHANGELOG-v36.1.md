# Jurisportal Next v36.1 — Relatórios do proprietário

## Alterações

- Relatórios agora são exclusivos do proprietário no menu, página e endpoint de exportação.
- Filtro por usuário aplicado aos domínios que possuem autoria/responsabilidade.
- Registro de sessão de funcionários por `Session.id` usando `AuditEvent`.
- Registro de entrada, logout manual, logout por inatividade e remoção pelo proprietário.
- Relatório de jornada mostra entrada, saída explícita, última atividade e duração registrada.
- Proprietário permanece fora dos indicadores de produtividade.
- Relatório diário automático preparado para 20h de São Paulo.
- Envio diário usa o e-mail do proprietário/contratante e o Resend existente.
- Rota `/api/cron/daily-owner-report` protegida por `CRON_SECRET`.
- `vercel.json` agenda 23:00 UTC, equivalente a 20:00 em São Paulo na configuração atual.
- Sem migration nova.

## Observação sobre saída

A aplicação não inventa uma hora de saída quando o navegador é encerrado sem logout. Nessa situação é exibida a última atividade conhecida.
