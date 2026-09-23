const ACTION_LABELS: Record<string, string> = {
  "client.created": "Cliente criado",
  "client.updated": "Cliente atualizado",
  "client.deleted_permanently": "Cliente excluído permanentemente",
  "organization.created": "Escritório criado",
  "process.created": "Processo criado",
  "process.updated": "Processo atualizado",
  "process.status_changed": "Status do processo alterado",
  "process.deleted_permanently": "Processo excluído permanentemente",
  "process.cnj_corrected": "Número CNJ corrigido",
  "process.timeline.manual_event_created": "Evento manual adicionado à linha do tempo",
  "process.deadline.created": "Prazo criado",
  "process.task.created": "Tarefa criada",
  "process.fee_agreement.updated": "Contrato de honorários atualizado",
  "process.finance_entry.created": "Lançamento financeiro criado",
  "process.publications_auto_linked": "Publicações vinculadas automaticamente",
  "publication.captured": "Comunicação recebida do DJeN",
  "publication.capture_completed": "Consulta ao DJeN concluída",
  "publication.capture_partial": "Consulta ao DJeN incompleta",
  "publication.identity_approved": "Comunicação confirmada",
  "publication.review_candidate_received": "Comunicação aguardando conferência",
  "publication.identity_dismissed": "Resultado descartado após conferência",
  "publication.process_linked": "Publicação vinculada ao processo",
  "publication.deadline_confirmed": "Prazo confirmado a partir da publicação",
  "publication.deadline_review_dismissed": "Revisão de prazo descartada",
  "publication.task_created": "Tarefa criada a partir da publicação",
  "publication.treated": "Publicação marcada como tratada",
  "publication.source_status_updated": "Status da publicação atualizado na origem",
  "task.updated": "Tarefa atualizada",
  "google_calendar.disconnected": "Google Calendar desconectado",
  "petition_template.created": "Modelo de petição criado",
  "petition_template.updated": "Modelo de petição atualizado",
  "petition_template.archived": "Modelo de petição arquivado",
  "petition_template.restored": "Modelo de petição restaurado",
  "petition_template.draft_generated": "Rascunho de petição gerado",
  "petition_generation.final_content_saved": "Revisão final da petição salva",
  "petition_generation.pdf_exported": "Petição exportada em PDF",
  "team.member.created": "Integrante da equipe criado",
  "team.member.removed": "Integrante da equipe removido",
  "team.member.initial_password_changed": "Senha provisória alterada no primeiro acesso",
  "team.session.started": "Sessão iniciada",
  "team.session.ended": "Sessão encerrada",
  "report.csv_exported": "Relatório exportado em CSV",
  "report.daily_email_sent": "Relatório diário enviado ao proprietário",
  "report.daily_email_failed": "Falha no envio do relatório diário",
  "settings.account.updated": "Dados da conta atualizados",
  "settings.office.updated": "Dados do escritório atualizados",
  "settings.notifications.updated": "Preferências de notificação atualizadas",
  "settings.password.changed": "Senha alterada",
  "settings.sessions.revoked": "Outras sessões encerradas",
  "settings.support.sent": "Solicitação enviada ao suporte",
  "settings.profile_photo.updated": "Foto de perfil atualizada",
  "settings.profile_photo.removed": "Foto de perfil removida",
  "notification.read": "Notificação marcada como lida",
  "import.clients.completed": "Importação de clientes concluída",
  "import.processes.completed": "Importação de processos concluída",
};

const CATEGORY_LABELS: Record<string, string> = {
  agenda: "Agenda",
  clients: "Clientes",
  finance: "Financeiro",
  integrations: "Integrações",
  onboarding: "Configuração inicial",
  processes: "Processos",
  publications: "Publicações e intimações",
  work_items: "Prazos e tarefas",
  petition_templates: "Modelos de petições",
  team: "Equipe",
  reports: "Relatórios",
  settings: "Configurações",
  imports: "Importações",
  notifications: "Notificações",
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  SYSTEM: "Sistema",
  DJEN: "DJeN",
  IMPORT: "Importação",
  MIGRATION: "Migração",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? "Alteração registrada";
}

export function auditCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? "Sistema";
}

export function operationalSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
