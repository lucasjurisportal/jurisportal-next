import { Footer } from "@/components/public-site/Footer";
import { Header } from "@/components/public-site/Header";
import { SocialIcons } from "@/components/public-site/SocialIcons";
import styles from "./contato.module.css";

export default function ContatoPage() {
  return (
    <>
      <Header />
      <main>
        <section className={styles.hero}>
          <div className="container">
            <span className="eyebrow">Fale com o Jurisportal</span>
            <h1>Quando precisar de ajuda, você precisa saber onde encontrar a gente.</h1>
            <p>Atendimento para dúvidas comerciais, suporte e informações sobre a plataforma.</p>
          </div>
        </section>

        <section className="section">
          <div className={`container ${styles.layout}`}>
            <div className={styles.infoColumn}>
              <article className={styles.infoCard}>
                <span>SAC</span>
                <a href="tel:+551129415656">(11) 2941-5656</a>
                <a href="mailto:lucasjurisportal@gmail.com">lucasjurisportal@gmail.com</a>
              </article>
              <article className={styles.infoCard}>
                <span>Horário de atendimento</span>
                <strong>2ª a 6ª · 09h às 18h</strong>
                <strong>Sábado · 10h às 14h</strong>
              </article>
              <article className={styles.infoCard}>
                <span>Endereço</span>
                <strong>R. José de Oliveira Gomes, 111</strong>
                <p>Centro, Poá - SP · CEP 08561-300</p>
              </article>
              <div className={styles.socialBlock}>
                <span>Redes sociais</span>
                <SocialIcons />
                <small>Os links dos perfis serão conectados quando os endereços oficiais forem definidos.</small>
              </div>
            </div>

            <div className={styles.formCard}>
              <span className="eyebrow">Mensagem</span>
              <h2>Como podemos ajudar?</h2>
              <p>Este formulário já define o padrão visual. O envio será conectado quando o backend estiver pronto.</p>
              <form className={styles.form}>
                <div className={styles.row}>
                  <label>Nome<input type="text" placeholder="Seu nome" /></label>
                  <label>Telefone<input type="tel" placeholder="(11) 99999-9999" /></label>
                </div>
                <label>E-mail<input type="email" placeholder="voce@escritorio.com.br" /></label>
                <label>Assunto
                  <select defaultValue="">
                    <option value="" disabled>Selecione</option>
                    <option>Quero conhecer o Jurisportal</option>
                    <option>Planos e contratação</option>
                    <option>Suporte</option>
                    <option>Privacidade e LGPD</option>
                    <option>Outro assunto</option>
                  </select>
                </label>
                <label>Mensagem<textarea rows={6} placeholder="Conte de forma breve como podemos ajudar." /></label>
                <button type="button">Enviar mensagem</button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
