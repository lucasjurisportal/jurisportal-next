# Jurisportal Next v38 — Acabamento funcional, Ajuda, Notificações, Perfil e Dashboard

## Configurações
- WhatsApp removido de Conta e acesso e mantido na ficha cadastral do escritório.
- ficha do escritório consolidada em Configurações.
- linguagem técnica e interna removida da experiência do cliente.
- Suporte com assuntos predefinidos, Outro, mensagem e prazo médio de até 48 horas.
- envio do suporte para `JURISPORTAL_SUPPORT_EMAIL` via Resend.

## Ajuda
- nova rota `/app/ajuda` abaixo de Configurações.
- tutoriais passo a passo dos módulos.
- tutorial contextual ao entrar em cada área.
- opção Não mostrar novamente e possibilidade de reativar pela Central de ajuda.

## Notificações
- sino funcional no topo.
- avisos reais de publicações, prazos, tarefas e agenda.
- contador de não lidas.
- marcar individualmente ou todas como lidas.
- leitura registrada por usuário sem nova tabela.

## Perfil
- menu da foto com Meu perfil, Configurações, Plano e cobrança e Sair.
- gaveta Meu perfil.
- alteração de nome e foto.
- exibição de função, acesso, OAB, escritório e sessão atual.

## Dashboard
- removidos números demonstrativos.
- indicadores reais de publicações, intimações, prazos, tarefas, audiências e processos.
- prioridades reais.
- atividade recente baseada em auditoria.
- agenda dos próximos dias.
- atividade da equipe apenas para o proprietário.

## Segurança e banco
- nenhuma migration nova.
- tenant preservado por `organizationId`.
- dados do Dashboard e notificações sempre derivados da organização ativa.
