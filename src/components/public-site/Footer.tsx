import Link from "next/link";
import { Brand } from "./Brand";
import { SocialIcons } from "./SocialIcons";
import styles from "./PublicSite.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.footerBrand}>
          <Brand />
          <p>Organização para a rotina jurídica ficar mais leve, clara e previsível.</p>
          <SocialIcons />
        </div>

        <div>
          <strong>Produto</strong>
          <Link href="/#recursos">Recursos</Link>
          <Link href="/#seguranca">Segurança</Link>
          <Link href="/#planos">Planos</Link>
          <Link href="/#faq">FAQ</Link>
        </div>

        <div>
          <strong>Empresa</strong>
          <Link href="/sobre">Sobre nós</Link>
          <Link href="/contato">Contato</Link>
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/privacidade">Privacidade e LGPD</Link>
          <Link href="/login">Área do cliente</Link>
        </div>

        <div>
          <strong>SAC</strong>
          <a href="tel:+551129415656">(11) 2941-5656</a>
          <a href="mailto:lucasjurisportal@gmail.com">lucasjurisportal@gmail.com</a>
          <span>R. José de Oliveira Gomes, 111<br/>Centro, Poá - SP · 08561-300</span>
        </div>

        <div>
          <strong>Atendimento</strong>
          <span>2ª a 6ª · 09h às 18h</span>
          <span>Sábado · 10h às 14h</span>
          <span>Domingos e feriados · fechado</span>
        </div>
      </div>
      <div className={`container ${styles.footerBottom}`}>© 2026 Jurisportal. Menos burocracia. Mais advocacia.</div>
    </footer>
  );
}
