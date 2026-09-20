"use client";

import Link from "next/link";
import { useState } from "react";
import {
  annualSavingsPercent,
  BillingCycle,
  currency,
  freePlan,
  getAnnualPrice,
  getCommercialPeriod,
  getDisplayedMonthlyPrice,
  getMonthlyPrice,
  paidPlans,
} from "@/data/plans";
import styles from "./PublicSite.module.css";

export function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const launchPromotionActive = getCommercialPeriod() === "launch";

  return (
    <section className={styles.pricingSection} id="planos">
      <div className="container">
        <div className={styles.pricingHeading}>
          <div>
            <span className="eyebrow">Planos Jurisportal</span>
            <h2 className="section-title">Comece pequeno e aumente a estrutura quando o escritório precisar.</h2>
            <p className="section-lead">
              O Free permite testar a rotina por três meses. Todos os planos pagos incluem monitoramento de publicações e intimações do DJeN.
            </p>
          </div>
          <div className={styles.billingToggle} role="group" aria-label="Forma de cobrança">
            <button className={cycle === "annual" ? styles.activeToggle : ""} onClick={() => setCycle("annual")} type="button">Anual</button>
            <button className={cycle === "monthly" ? styles.activeToggle : ""} onClick={() => setCycle("monthly")} type="button">Mensal</button>
          </div>
        </div>

        <article className={styles.freePlanCard}>
          <div className={styles.freePlanIntro}>
            <span className={styles.planBadge}>Entrada</span>
            <h3>{freePlan.name}</h3>
            <strong>Grátis por {freePlan.freeMonths} meses</strong>
            <p>{freePlan.description}</p>
            <Link className="primary-button" href="/cadastro?plano=free">Começar grátis</Link>
          </div>
          <div className={styles.freePlanFeatures}>
            {freePlan.publicLaunchFeatures.map((feature) => <span key={feature}>✓ {feature}</span>)}
          </div>
        </article>

        <div className={styles.pricingGrid}>
          {paidPlans.map((plan) => {
            const savings = annualSavingsPercent(plan);
            const price = getDisplayedMonthlyPrice(plan, cycle);
            const annualPrice = getAnnualPrice(plan);
            const monthlyPrice = getMonthlyPrice(plan);
            return (
              <article className={`${styles.priceCard} ${plan.featured ? styles.featuredPlan : ""}`} key={plan.slug}>
                {plan.featured && <span className={styles.popularBadge}>Mais escolhido</span>}
                <div className={styles.planTop}>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>

                <div className={styles.planPrice}>
                  <strong>{currency(price)}</strong><span>/mês</span>
                </div>

                {cycle === "annual" ? (
                  <p className={styles.planBilling}>Cobrado {currency(annualPrice)} por ano · economize {String(savings).replace(".", ",")}%</p>
                ) : (
                  <p className={styles.planBilling}>Cobrança mensal recorrente · tabela atual {currency(monthlyPrice)}</p>
                )}

                {launchPromotionActive && (
                  <p className={styles.planBilling}>
                    Preço promocional até 30/06/2027. Depois {currency(plan.pricing.standardMonthly)}/mês.
                  </p>
                )}

                <Link className={styles.contractButton} href={`/cadastro?plano=${plan.slug}&ciclo=${cycle}`}>Contrate agora</Link>

                <div className={styles.planFeatures}>
                  {plan.inheritedFrom && <strong>Tudo do plano {plan.inheritedFrom} +</strong>}
                  {plan.publicLaunchFeatures.map((feature) => <span key={feature}>✓ {feature}</span>)}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
