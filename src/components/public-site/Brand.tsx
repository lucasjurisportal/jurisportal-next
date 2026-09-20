import Image from "next/image";
import styles from "./PublicSite.module.css";

export function Brand() {
  return (
    <div className={styles.brand}>
      <Image
        className={styles.brandLogo}
        src="/brand/jurisportal-logo-original.png"
        alt="Jurisportal - Menos burocracia. Mais advocacia."
        width={1743}
        height={845}
        priority
      />
    </div>
  );
}
