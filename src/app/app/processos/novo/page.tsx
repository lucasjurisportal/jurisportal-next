import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { buildPublicationProcessPrefill } from "@/modules/publications/domain/publication-process-prefill";
import { getPublicationDetail } from "@/modules/publications/application/publication-service";
import { getProcessFormOptions } from "@/modules/processes/application/process-service";
import { ProcessForm } from "@/components/processes/ProcessForm";
import styles from "@/components/processes/Processes.module.css";

export default async function NewProcessPage({ searchParams }: { searchParams: Promise<{ publicationId?: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const { publicationId } = await searchParams;
  const [options, publication] = await Promise.all([
    getProcessFormOptions(context.workspace.organizationId),
    publicationId && /^[0-9a-f-]{36}$/i.test(publicationId)
      ? getPublicationDetail(context.workspace.organizationId, publicationId) : Promise.resolve(null),
  ]);
  const initialValue = buildPublicationProcessPrefill(
    publication, context.user.id, options.members.map((member) => member.user.id),
  );
  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Processos</span><h1>Novo processo</h1>
    <p>{initialValue ? "Dados sugeridos a partir do DJeN. Confira o número, as partes e selecione o cliente antes de salvar. A publicação será vinculada automaticamente ao processo cadastrado." : "Cadastre o número CNJ, vincule o cliente e complemente os dados disponíveis."}</p>
  </div></section><ProcessForm clients={options.clients} members={options.members} currentUserId={context.user.id} initialValue={initialValue} /></div>;
}
