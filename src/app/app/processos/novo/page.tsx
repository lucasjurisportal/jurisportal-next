import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getProcessFormOptions } from "@/modules/processes/application/process-service";
import { ProcessForm } from "@/components/processes/ProcessForm";
import styles from "@/components/processes/Processes.module.css";

export default async function NewProcessPage() {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const options = await getProcessFormOptions(context.workspace.organizationId);
  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Processos</span><h1>Novo processo</h1><p>Cadastre o número CNJ, vincule o cliente e complemente os dados disponíveis.</p></div></section><ProcessForm clients={options.clients} members={options.members} currentUserId={context.user.id} /></div>;
}
