"use client";

import { useMemo, useState } from "react";
import { helpModules } from "@/modules/help/domain/help-content";
import { HelpResetButton } from "@/components/help/HelpResetButton";
import styles from "@/components/help/Help.module.css";

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [opened, setOpened] = useState<string[]>(["publicacoes"]);
  const filtered = useMemo(() => {
    const query = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!query) return helpModules;
    return helpModules.filter((module) => [module.title, module.description, ...module.steps, ...module.tips]
      .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query));
  }, [search]);

  function toggle(key: string) {
    setOpened((values) => values.includes(key) ? values.filter((item) => item !== key) : [...values, key]);
  }

  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>Ajuda</span><h1>Como podemos ajudar?</h1>
        <p>Encontre o que precisa e siga o passo a passo no seu ritmo. Você pode voltar a qualquer tutorial quando quiser.</p>
      </div>
      <HelpResetButton />
    </section>
    <label className={styles.helpSearch}>
      <span>O que você quer fazer?</span>
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Ex.: conferir uma publicação, cadastrar auxiliar, criar prazo..." />
    </label>
    <nav className={styles.index} aria-label="Ir para um tutorial">
      {filtered.map((module) => <a key={module.key} href={`#${module.key}`}
        onClick={() => setOpened((values) => values.includes(module.key) ? values : [...values, module.key])}>
        {module.shortTitle}
      </a>)}
    </nav>
    {!search ? <section className={styles.moduleCard} id="comecando">
      <div className={styles.moduleHead}><div><span className={styles.eyebrow}>Comece por aqui</span>
        <h2>Sua rotina no Jurisportal</h2><p>Um caminho simples para acompanhar o escritório sem perder o que precisa de atenção.</p></div></div>
      <div className={styles.steps}><div><h3>Por onde começar</h3><ol>
        <li>Confira o que precisa de atenção no Dashboard.</li>
        <li>Abra Publicações para ver as comunicações recebidas e os resultados para revisão.</li>
        <li>Revise as datas antes de confirmar prazos. Nada é confirmado automaticamente.</li>
        <li>Atualize processos e tarefas conforme o trabalho avançar.</li>
      </ol></div><aside className={styles.tips}><h3>Sempre à mão</h3><ul>
        <li>O sino mostra avisos recentes.</li><li>Sua foto abre Meu perfil e o menu da conta.</li>
        <li>O botão de ajuda nas outras telas também traz orientações específicas.</li>
      </ul></aside></div>
    </section> : null}
    <p className={styles.resultsLabel}>{filtered.length} {filtered.length === 1 ? "tutorial encontrado" : "tutoriais disponíveis"}</p>
    {filtered.length === 0 ? <section className={styles.moduleCard}>
      <h2>Não encontramos esse assunto</h2><p>Experimente uma palavra mais curta, como processo, prazo, equipe ou e-mail.</p>
      <button type="button" className={styles.resetButton} onClick={() => setSearch("")}>Ver todos os tutoriais</button>
    </section> : null}
    {filtered.map((module) => {
      const expanded = Boolean(search.trim()) || opened.includes(module.key);
      return <section className={styles.moduleCard} id={module.key} key={module.key}>
        <div className={styles.moduleHead}>
          <div><span className={styles.eyebrow}>Tutorial</span><h2>{module.title}</h2><p>{module.description}</p></div>
          <button className={styles.resetButton} type="button" aria-expanded={expanded}
            aria-controls={`tutorial-${module.key}`} onClick={() => toggle(module.key)}>
            {expanded ? "Recolher" : "Ver passo a passo"}
          </button>
        </div>
        {expanded ? <div id={`tutorial-${module.key}`} className={styles.steps}>
          <div><h3>Como fazer</h3><ol>{module.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
          <aside className={styles.tips}><h3>Vale saber</h3><ul>{module.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            <HelpResetButton moduleKey={module.key} />
          </aside>
        </div> : null}
      </section>;
    })}
  </div>;
}
