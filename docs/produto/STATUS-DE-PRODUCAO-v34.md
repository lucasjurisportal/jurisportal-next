# Status de produção — v34

## Núcleo funcional
- PostgreSQL/Supabase + Prisma/migrations
- multi-tenancy por `organizationId`
- autenticação, e-mail verificado, 2FA, trusted device e recuperação
- PLATFORM_MASTER e ambiente Jurisportal Internal
- Clientes
- Processos + Processo 360
- Prazos e Tarefas
- Agenda
- Google Calendar unidirecional
- Financeiro jurídico básico por processo
- Publicações e Intimações DJeN
- revisão humana de prazo
- identidade interna do processo e CNJ bloqueado
- Modelos de Petições v1

## Parcial / em evolução
- Dashboard ainda precisa consumir todos os dados reais relevantes
- Documentos ainda sem object storage
- Equipe/permissões ainda não é módulo completo
- Relatórios ainda não são módulo completo
- Configurações/Plano e cobrança ainda não estão finalizados
- notificações de publicações por e-mail/WhatsApp ainda precisam fechamento operacional
- scheduler real do DJeN precisa ambiente de execução em produção
- migração de outros sistemas está desenhada, não implementada

## Antes de beta comercial
- Documentos + R2 + quotas
- permissões/equipe
- relatórios mínimos
- cobrança Asaas e ciclo de assinatura
- jobs/scheduler de produção
- testes E2E dos fluxos críticos
- staging
- revisão de segurança/RLS/policies
- observabilidade/logs/backup/restauração
- termos/privacidade finais conforme funcionalidades reais
- landing final sem prometer recurso não validado

## Depois do beta / expansão
- IA Premium+
- DataJud/provider processual auxiliar
- importação avançada de carteira/autos
- protocolo judicial via providers homologados
- certificado digital
- NFS-e
