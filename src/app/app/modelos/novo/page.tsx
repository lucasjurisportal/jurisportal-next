import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { PetitionTemplateForm } from "@/components/petition-templates/PetitionTemplateForm";
import styles from "@/components/petition-templates/PetitionTemplates.module.css";

export default async function NewPetitionTemplatePage() {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) redirect("/app/modelos");
  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Modelos de petições</span><h1>Novo modelo do escritório</h1><p>Crie uma base reutilizável e use variáveis para preencher dados autorizados no momento da geração.</p></div><Link className={styles.secondaryButton} href="/app/modelos">← Voltar</Link></section><PetitionTemplateForm /></div>;
}
