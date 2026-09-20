import { helpModules } from "@/modules/help/domain/help-content";
import { HelpResetButton } from "@/components/help/HelpResetButton";
import styles from "@/components/help/Help.module.css";

export default function HelpPage() {
  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>Central de ajuda</span><h1>Como usar o Jurisportal</h1><p>Consulte o passo a passo de cada área sempre que precisar. Os tutoriais que você dispensar nas telas continuam disponíveis aqui.</p></div>
      <HelpResetButton />
    </section>
    <nav className={styles.index} aria-label="Tutoriais disponíveis">{helpModules.map((module) => <a key={module.key} href={`#${module.key}`}>{module.shortTitle}</a>)}</nav>
    <section className={styles.moduleCard} id="comecando">
      <div className={styles.moduleHead}><div><span className={styles.eyebrow}>Comece por aqui</span><h2>Usando o Jurisportal no dia a dia</h2><p>O sino reúne avisos que pedem atenção e a sua foto abre atalhos para perfil, configurações, plano e saída da conta.</p></div></div>
      <div className={styles.steps}><div><h3>Rotina recomendada</h3><ol><li>Abra o Dashboard e confira prazos, publicações e compromissos.</li><li>Use o sino para abrir rapidamente avisos ainda não lidos.</li><li>Trabalhe pelos módulos e mantenha responsáveis, datas e status atualizados.</li><li>No fim do dia, o proprietário pode revisar Relatórios e a atividade da equipe.</li></ol></div><aside className={styles.tips}><h3>Atalhos úteis</h3><ul><li>Clique na sua foto para abrir Meu perfil.</li><li>Em Configurações você encontra dados do escritório, segurança, notificações, importação e suporte.</li><li>Se dispensar um tutorial, ele continua disponível nesta Central de ajuda.</li></ul></aside></div>
    </section>
    {helpModules.map((module) => <section className={styles.moduleCard} id={module.key} key={module.key}>
      <div className={styles.moduleHead}><div><span className={styles.eyebrow}>Tutorial</span><h2>{module.title}</h2><p>{module.description}</p></div><HelpResetButton moduleKey={module.key} /></div>
      <div className={styles.steps}><div><h3>Passo a passo</h3><ol>{module.steps.map((step) => <li key={step}>{step}</li>)}</ol></div><aside className={styles.tips}><h3>Boas práticas</h3><ul>{module.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></aside></div>
    </section>)}
  </div>;
}
