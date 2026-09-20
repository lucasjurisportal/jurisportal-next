import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { listPetitionTemplates } from "@/modules/petition-templates/application/petition-template-service";
import styles from "@/components/petition-templates/PetitionTemplates.module.css";

function scopeLabel(scope: string) {
  if (scope === "PROCESS" || scope === "Processo") return "Processo";
  if (scope === "CLIENT" || scope === "Cliente") return "Cliente";
  return "Geral";
}

export default async function PetitionTemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; origin?: string; archived?: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const canUse = hasCapability(context.workspace.plan, "petitionTemplates.basic");
  const query = await searchParams;

  if (!canUse) {
    return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Modelos de petições</span><h1>Biblioteca de modelos</h1><p>Crie modelos reutilizáveis e preencha dados do escritório, cliente e processo.</p></div></section><section className={styles.locked}><h2>Recurso disponível nos planos pagos</h2><p>O plano Free mantém o foco em organização básica. Modelos de petições começam no Essencial.</p></section></div>;
  }

  const origin = query.origin === "OFFICIAL" || query.origin === "OFFICE" ? query.origin : undefined;
  const result = await listPetitionTemplates({ organizationId: context.workspace.organizationId, query: query.q, category: query.category, origin, includeArchived: query.archived === "1" });
  const categories = Array.from(new Set([...result.official.map((item) => item.category), ...result.office.map((item) => item.category)])).sort((a,b)=>a.localeCompare(b,"pt-BR"));

  return <div className={styles.page}>
    <section className={styles.heading}><div><span className={styles.eyebrow}>Modelos de petições</span><h1>Biblioteca de modelos</h1><p>Use modelos-base do Jurisportal ou mantenha versões próprias do escritório.</p></div><Link className={styles.primaryButton} href="/app/modelos/novo">Novo modelo</Link></section>
    <form className={styles.filters} method="get"><input name="q" defaultValue={query.q ?? ""} placeholder="Buscar por nome ou categoria..." /><select name="category" defaultValue={query.category ?? ""}><option value="">Todas as categorias</option>{categories.map((category)=><option key={category} value={category}>{category}</option>)}</select><select name="origin" defaultValue={origin ?? ""}><option value="">Todas as origens</option><option value="OFFICIAL">Jurisportal</option><option value="OFFICE">Escritório</option></select><button className={styles.secondaryButton}>Filtrar</button></form>

    {origin !== "OFFICE" ? <section className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>Jurisportal</span><h2>Modelos-base</h2><p>Bases editáveis apenas no rascunho. Revise sempre antes do uso.</p></div></div><div className={styles.grid}>{result.official.length ? result.official.map((template)=><Link className={styles.card} key={template.slug} href={`/app/modelos/oficiais/${template.slug}`}><div className={styles.cardTop}><span className={styles.badge}>Jurisportal</span><small>v{template.version}</small></div><strong>{template.name}</strong><p>{template.category}</p><small>Uso: {scopeLabel(template.scope)}</small></Link>) : <div className={styles.empty}>Nenhum modelo oficial encontrado.</div>}</div></section> : null}

    {origin !== "OFFICIAL" ? <section className={styles.section}><div className={styles.sectionHeader}><div><span className={styles.eyebrow}>Escritório</span><h2>Seus modelos</h2><p>Cada salvamento cria uma nova versão preservando o histórico.</p></div><Link className={styles.secondaryButton} href={`/app/modelos?${new URLSearchParams({...(query.q?{q:query.q}:{}),...(query.category?{category:query.category}:{}),origin:"OFFICE",archived:query.archived==="1"?"0":"1"}).toString()}`}>{query.archived === "1" ? "Ocultar arquivados" : "Mostrar arquivados"}</Link></div><div className={styles.grid}>{result.office.length ? result.office.map((template)=><Link className={styles.card} key={template.id} href={`/app/modelos/${template.id}`}><div className={styles.cardTop}><span className={template.status === "ARCHIVED" ? styles.badgeArchived : styles.badgeOffice}>{template.status === "ARCHIVED" ? "Arquivado" : "Escritório"}</span><small>v{template.currentVersion}</small></div><strong>{template.name}</strong><p>{template.category}</p><small>Uso: {scopeLabel(template.scope)} · atualizado em {template.updatedAt.toLocaleDateString("pt-BR")}</small></Link>) : <div className={styles.empty}>Nenhum modelo próprio encontrado.</div>}</div></section> : null}
  </div>;
}
