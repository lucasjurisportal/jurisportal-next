import styles from "./PublicSite.module.css";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.8" r="1" className={styles.socialFill} />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.2H3.6V20h2.9V8.2ZM5 3.5a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20.4 13.2c0-3.6-1.9-5.3-4.5-5.3-2.1 0-3 1.1-3.5 1.9V8.2H9.5V20h2.9v-5.8c0-1.5.3-3 2.2-3 1.9 0 1.9 1.8 1.9 3.1V20h2.9v-6.8Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.8 21v-8h2.8l.4-3h-3.2V8.1c0-.9.2-1.5 1.6-1.5H17V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10H8v3h2.6v8h3.2Z" />
    </svg>
  );
}

export function SocialIcons() {
  return (
    <div className={styles.socialIcons} aria-label="Redes sociais do Jurisportal">
      <span className={styles.socialIcon} title="Instagram" aria-label="Instagram"><InstagramIcon /></span>
      <span className={styles.socialIcon} title="LinkedIn" aria-label="LinkedIn"><LinkedInIcon /></span>
      <span className={styles.socialIcon} title="Facebook" aria-label="Facebook"><FacebookIcon /></span>
    </div>
  );
}
