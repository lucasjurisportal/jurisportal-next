import { Footer } from "@/components/public-site/Footer";
import { Header } from "@/components/public-site/Header";
import styles from "./sobre.module.css";

export default function SobrePage() {
  return (
    <>
      <Header />
      <main>
        <section className={styles.hero}>
          <div className="container">
            <span className="eyebrow">Sobre o Jurisportal</span>
            <h1>Feito dentro da advocacia antes de virar produto para a advocacia.</h1>
            <p>O Jurisportal começou em 2010 dentro de um escritório, criado para resolver uma rotina que já era burocrática demais. A solução passou a ser usada por outros profissionais e, agora, entra em uma nova fase tecnológica sem abandonar o que sempre guiou o produto: facilitar o trabalho jurídico real.</p>
          </div>
        </section>
        <section className="section">
          <div className={`container ${styles.grid}`}>
            <article><strong>2010</strong><h2>Nasce de um problema real</h2><p>Jonas Oliveira criou a plataforma para organizar processos e rotinas administrativas do próprio escritório.</p></article>
            <article><strong>Experiência acumulada</strong><h2>Cresceu com quem usa</h2><p>O sistema passou a atender outros escritórios e amadureceu acompanhando a rotina de quem advoga todos os dias.</p></article>
            <article><strong>Jurisportal Next</strong><h2>Mesma essência, nova tecnologia</h2><p>Modernizamos arquitetura, experiência e escala para entregar uma plataforma mais simples, rápida e preparada para o futuro.</p></article>
          </div>
        </section>
        <section className={styles.purpose}>
          <div className="container">
            <span className="eyebrow eyebrow-light">Nosso compromisso</span>
            <h2>Menos burocracia. Mais advocacia.</h2>
            <p>Não é só uma frase de marca. É o critério para decidir o que entra no produto: se uma função não ajuda o escritório a ganhar clareza, tempo ou segurança operacional, ela precisa ser repensada.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
