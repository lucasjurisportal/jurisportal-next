import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { getPetitionGenerationOptions } from "@/modules/petition-templates/application/petition-template-service";
import { getOfficialPetitionTemplate } from "@/modules/petition-templates/domain/official-templates";
import { PetitionDraftGenerator } from "@/components/petition-templates/PetitionDraftGenerator";
import { OfficialTemplateCopyButton } from "@/components/petition-templates/OfficialTemplateCopyButton";
import styles from "@/components/petition-templates/PetitionTemplates.module.css";

export default async function OfficialPetitionTemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) redirect("/app/modelos");
  const { slug } = await params;
  const template = getOfficialPetitionTemplate(slug);
  if (!template) notFound();
  const options = await getPetitionGenerationOptions(context.workspace.organizationId);
  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Modelo Jurisportal</span><h1>{template.name}</h1><div className={styles.meta}><span>{template.category}</span><span>Versão {template.version}</span><span>Uso: {template.scope}</span></div></div><Link className={styles.secondaryButton} href="/app/modelos">← Biblioteca</Link></section><section className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>Conteúdo-base</span><h2>Revise antes de usar</h2><p>O Jurisportal fornece uma estrutura inicial. Adequação jurídica continua sendo responsabilidade do advogado.</p></div></div><div className={styles.templateContent}>{template.content}</div><div className={styles.actions}><OfficialTemplateCopyButton name={template.name} category={template.category} scope={template.scope} content={template.content} /></div></section><PetitionDraftGenerator source="OFFICIAL" officialSlug={template.slug} processes={options.processes} clients={options.clients} /></div>;
}
