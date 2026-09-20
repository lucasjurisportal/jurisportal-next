# ADR-023 — Relatórios reservados ao proprietário e envio diário

## Status

Aceito.

## Contexto

Relatórios no Jurisportal têm função de gestão do escritório. A principal necessidade é permitir ao contratante acompanhar operação, jornada dos funcionários e ações realizadas dentro da aplicação, sem criar monitoramento do computador ou da atividade externa do usuário.

Também foi definido que o mesmo relatório deve chegar automaticamente ao e-mail principal da conta.

## Decisão

1. A central `/app/relatorios` é exclusiva do proprietário.
2. Nível 1 e Nível 2 não acessam Relatórios, mesmo por URL direta.
3. Sessões de funcionários são representadas em `AuditEvent`, vinculadas ao `Session.id`.
4. Entrada, logout manual, logout por inatividade e remoção pelo proprietário são auditados.
5. Quando não existe logout explícito, a aplicação exibe a última atividade conhecida, sem fabricar uma hora de saída.
6. O proprietário não integra os indicadores de produtividade.
7. O relatório aceita filtro por usuário.
8. O relatório diário é enviado ao `Member.role = owner`, atual referência do contratante/e-mail principal.
9. O envio diário usa a mesma consulta da tela para evitar divergência de números.
10. O agendamento é exposto por rota protegida por `CRON_SECRET`; Vercel Cron é uma implementação de scheduler, não uma dependência de domínio.

## Consequências

- não é necessária migration;
- autoria e auditoria históricas permanecem preservadas;
- funcionários não recebem informações gerenciais do escritório;
- um scheduler diferente poderá substituir o Vercel Cron sem alterar a aplicação de Relatórios;
- quando Plano/Cobrança introduzir e-mail específico do pagador, apenas o resolvedor de destinatário deverá ser atualizado.
