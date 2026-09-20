import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { listClients } from "@/modules/clients/application/client-service";
import { formatCnpj, formatCpf } from "@/modules/clients/domain/tax-id";
import styles from "@/components/clients/Clients.module.css";

function pageHref(current: URLSearchParams, page: number) {
  const params = new URLSearchParams(current);
  params.set("page", String(page));
  return `/app/clientes?${params.toString()}`;
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : "";
  const kind = raw.kind === "PF" || raw.kind === "PJ" ? raw.kind : undefined;
  const status = raw.status === "ACTIVE" || raw.status === "ARCHIVED" ? raw.status : undefined;
  const state = typeof raw.state === "string" ? raw.state.toUpperCase() : undefined;
  const page = typeof raw.page === "string" ? Number(raw.page) : 1;

  const result = await listClients({ organizationId: context.workspace.organizationId, query: q || undefined, kind, status, state, page });
  const [activeCount, archivedCount] = await Promise.all([
    prisma.client.count({ where: { organizationId: context.workspace.organizationId, status: "ACTIVE" } }),
    prisma.client.count({ where: { organizationId: context.workspace.organizationId, status: "ARCHIVED" } }),
  ]);
  const current = new URLSearchParams();
  if (q) current.set("q", q);
  if (kind) current.set("kind", kind);
  if (status) current.set("status", status);
  if (state) current.set("state", state);

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <div><span className={styles.eyebrow}>Cadastro central</span><h1>Clientes</h1><p>Um único cadastro para processos, documentos, comunicação e financeiro jurídico.</p></div>
        <Link className={styles.primaryButton} href="/app/clientes/novo">+ Novo cliente</Link>
      </section>

      <section className={styles.summary}>
        <div className={styles.summaryCard}><strong>{activeCount}</strong><span>ativos</span></div>
        <div className={styles.summaryCard}><strong>{archivedCount}</strong><span>arquivados</span></div>
        <div className={styles.summaryCard}><strong>{context.workspace.plan.clientsLimit === "unlimited" ? "∞" : context.workspace.plan.clientsLimit}</strong><span>limite do plano</span></div>
      </section>

      <form className={styles.toolbar} method="get">
        <input name="q" defaultValue={q} placeholder="Buscar nome, CPF/CNPJ, telefone ou e-mail..." />
        <select name="kind" defaultValue={kind ?? ""}><option value="">PF e PJ</option><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select>
        <select name="status" defaultValue={status ?? ""}><option value="">Todos os status</option><option value="ACTIVE">Ativos</option><option value="ARCHIVED">Arquivados</option></select>
        <input name="state" defaultValue={state ?? ""} maxLength={2} placeholder="UF" />
        <button className={styles.secondaryButton} type="submit">Filtrar</button>
      </form>

      <section className={styles.tablePanel}>
        {result.items.length === 0 ? (
          <div className={styles.empty}><strong>Nenhum cliente encontrado.</strong><p>Cadastre o primeiro cliente ou ajuste os filtros da busca.</p><Link className={styles.primaryButton} href="/app/clientes/novo">Cadastrar cliente</Link></div>
        ) : (
          <table className={styles.table}>
            <thead><tr><th>Cliente</th><th>Documento</th><th>Contato</th><th>Localidade</th><th>Processos</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {result.items.map((client) => (
                <tr key={client.id}>
                  <td className={styles.clientName}><strong>{client.kind === "PJ" && client.tradeName ? client.tradeName : client.name}</strong><span>{client.kind === "PJ" && client.tradeName ? client.name : client.email}</span></td>
                  <td><span className={`${styles.tag} ${client.kind === "PF" ? styles.tagPf : styles.tagPj}`}>{client.kind}</span> {client.kind === "PF" ? formatCpf(client.taxIdNormalized) : formatCnpj(client.taxIdNormalized)}</td>
                  <td>{client.whatsapp}</td>
                  <td>{client.city}/{client.state}</td>
                  <td>{client.processLinks.length} ativos · {client._count.processLinks} total</td>
                  <td>{client.status === "ARCHIVED" ? <span className={`${styles.tag} ${styles.tagArchived}`}>Arquivado</span> : "Ativo"}</td>
                  <td><div className={styles.actions}><Link className={styles.textLink} href={`/app/clientes/${client.id}/editar`}>Abrir / editar</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={styles.pagination}><span>Página {result.page} de {result.totalPages} · {result.total} resultado(s)</span><div className={styles.paginationNav}>{result.page > 1 ? <Link href={pageHref(current, result.page - 1)}>← Anterior</Link> : null}{result.page < result.totalPages ? <Link href={pageHref(current, result.page + 1)}>Próxima →</Link> : null}</div></div>
      </section>
    </div>
  );
}
