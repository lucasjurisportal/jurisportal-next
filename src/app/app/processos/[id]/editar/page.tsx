import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getProcess, getProcessFormOptions } from "@/modules/processes/application/process-service";
import { ProcessForm } from "@/components/processes/ProcessForm";
import styles from "@/components/processes/Processes.module.css";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";
import { isProcessLookupEnabled } from "@/modules/integrations/process-metadata/infrastructure/datajud-client";

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const { id } = await params;
  const [process, options] = await Promise.all([getProcess(context.workspace.organizationId, id), getProcessFormOptions(context.workspace.organizationId)]);
  if (!process) notFound();
  const canEditCnj = context.workspace.organizationSlug === "jurisportal-internal" && await isPlatformMaster(context.user.id);
  const primary = process.clients.find((link) => link.isPrimary) ?? process.clients[0];
  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Processos</span><h1>Editar processo</h1><p>As alterações são auditadas e aparecem na linha do tempo. O número CNJ permanece bloqueado para usuários do escritório.</p></div></section><ProcessForm clients={options.clients} members={options.members} currentUserId={context.user.id} canEditCnj={canEditCnj} lookupEnabled={isProcessLookupEnabled()} initialValue={{ id: process.id, cnj: process.cnjFormatted, primaryClientId: primary?.clientId ?? "", additionalClientIds: process.clients.filter((link) => link.clientId !== primary?.clientId).map((link) => link.clientId), responsibleUserId: process.responsibleUserId ?? "", court: process.court ?? "", division: process.division ?? "", district: process.district ?? "", forum: process.forum ?? "", processClass: process.processClass ?? "", subject: process.subject ?? "", caseValue: process.caseValue ? Number(process.caseValue.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", distributionDate: process.distributionDate ? process.distributionDate.toISOString().slice(0,10) : "", notes: process.notes ?? "", parties: process.parties.map((party) => ({ name: party.name, role: party.role, document: party.document ?? "" })), status: process.status }} /></div>;
}
