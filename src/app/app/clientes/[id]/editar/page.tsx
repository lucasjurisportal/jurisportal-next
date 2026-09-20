import { notFound, redirect } from "next/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import styles from "@/components/clients/Clients.module.css";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getClient } from "@/modules/clients/application/client-service";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const { id } = await params;
  const client = await getClient(context.workspace.organizationId, id);
  if (!client) notFound();

  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Clientes</span><h1>Editar cliente</h1><p>Alterações ficam vinculadas ao mesmo cadastro e serão auditadas.</p></div></section><ClientForm initialValue={{ id: client.id, kind: client.kind as "PF" | "PJ", name: client.name, tradeName: client.tradeName ?? "", taxId: client.taxIdRaw, birthDate: client.birthDate ? client.birthDate.toISOString().slice(0,10) : "", primaryContactName: client.primaryContactName ?? "", email: client.email, whatsapp: client.whatsapp, phone: client.phone ?? "", postalCode: client.postalCode, street: client.street, number: client.number, complement: client.complement ?? "", district: client.district, city: client.city, state: client.state, notes: client.notes ?? "", status: client.status }} /></div>;
}
