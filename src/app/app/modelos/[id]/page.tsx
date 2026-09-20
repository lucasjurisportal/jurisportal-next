import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { getPetitionGenerationOptions, getPetitionTemplate } from "@/modules/petition-templates/application/petition-template-service";
import { PetitionTemplateForm } from "@/components/petition-templates/PetitionTemplateForm";
import { PetitionTemplateArchiveButton } from "@/components/petition-templates/PetitionTemplateArchiveButton";
import { PetitionDraftGenerator } from "@/components/petition-templates/PetitionDraftGenerator";
import styles from "@/components/petition-templates/PetitionTemplates.module.css";

export default async function OfficePetitionTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) redirect("/app/modelos");
  const { id } = await params;
  const [template, options] = await Promise.all([getPetitionTemplate(context.workspace.organizationId, id), getPetitionGenerationOptions(context.workspace.organizationId)]);
  if (!template) notFound();
  return <div className={styles.page}>
    <section className={styles.heading}><div><span className={styles.eyebrow}>Modelo do escritório</span><h1>{template.name}</h1><div className={styles.meta}><span>{template.category}</span><span>Versão atual {template.currentVersion}</span><span>{template.status === "ARCHIVED" ? "Arquivado" : "Ativo"}</span></div></div><div className={styles.actions}><Link className={styles.secondaryButton} href="/app/modelos">← Biblioteca</Link><PetitionTemplateArchiveButton templateId={template.id} archived={template.status === "ARCHIVED"} /></div></section>
    {template.status === "ACTIVE" ? <PetitionTemplateForm initialValue={{ id: template.id, name: template.name, category: template.category, scope: template.scope as "CLIENT"|"PROCESS"|"GENERAL", content: template.content }} /> : <section className={styles.locked}><h2>Modelo arquivado</h2><p>O conteúdo e o histórico foram preservados. Restaure o modelo para editar ou gerar novos rascunhos.</p></section>}
    <section className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>Versões</span><h2>Histórico do modelo</h2><p>Cada salvamento cria um snapshot imutável.</p></div></div><div className={styles.history}>{template.versions.map((version)=><div className={styles.historyItem} key={version.id}><strong>Versão {version.version}</strong><span>{version.createdAt.toLocaleString("pt-BR")} · {version.createdBy?.name || "Sistema"}</span></div>)}</div></section>
    {template.status === "ACTIVE" ? <PetitionDraftGenerator source="OFFICE" templateId={template.id} processes={options.processes} clients={options.clients} /> : null}
  </div>;
}
