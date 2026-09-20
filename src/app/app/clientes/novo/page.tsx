import { ClientForm } from "@/components/clients/ClientForm";
import styles from "@/components/clients/Clients.module.css";

export default function NewClientPage() {
  return <div className={styles.page}><section className={styles.heading}><div><span className={styles.eyebrow}>Clientes</span><h1>Novo cliente</h1><p>Cadastre uma pessoa física ou jurídica. Você poderá reutilizar este cadastro em todo o Jurisportal.</p></div></section><ClientForm /></div>;
}
