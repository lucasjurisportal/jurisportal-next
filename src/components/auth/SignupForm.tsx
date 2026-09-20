"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  annualSavingsPercent,
  BillingCycle,
  currency,
  getCommercialPeriod,
  getDisplayedMonthlyPrice,
  plans,
} from "@/data/plans";
import { authClient } from "@/infrastructure/auth/auth-client";
import styles from "./Auth.module.css";

type AddressState = {
  street: string;
  district: string;
  city: string;
  state: string;
};

const emptyAddress: AddressState = { street: "", district: "", city: "", state: "" };

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const initialSlug = search.get("plano") || "free";
  const initialCycle: BillingCycle = search.get("ciclo") === "monthly" ? "monthly" : "annual";

  const [selectedPlanSlug, setSelectedPlanSlug] = useState(
    plans.some((item) => item.slug === initialSlug) ? initialSlug : "free",
  );
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);

  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<AddressState>(emptyAddress);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const lastFetchedCep = useRef("");

  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedPrivacy, setAcknowledgedPrivacy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedPlan = plans.find((item) => item.slug === selectedPlanSlug) || plans[0];
  const launchPromotionActive = getCommercialPeriod() === "launch";
  const emailMismatch = emailConfirm.length > 0 && email !== emailConfirm;
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordTooShort = password.length > 0 && password.length < 8;

  function closeCadastro() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  async function submitPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);

    const invalidAccess =
      !email ||
      !emailConfirm ||
      emailMismatch ||
      !password ||
      !passwordConfirm ||
      passwordMismatch ||
      password.length < 8;

    if (invalidAccess || !acceptedTerms || !acknowledgedPrivacy) return;

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const officeName = String(data.get("office") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const oabNumber = String(data.get("oab") || "").trim();
    const oabState = String(data.get("oabUf") || "").trim();
    const number = String(data.get("number") || "").trim();
    const complement = String(data.get("complement") || "").trim();

    if (!name || !officeName || !phone || !oabNumber || !oabState || !number) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!cep || !address.street || !address.district || !address.city || !address.state) {
      setFormError("Confira os dados de endereço antes de continuar.");
      return;
    }

    setPending(true);

    try {
      const currentSession = await authClient.getSession();

      if (!currentSession.data?.user) {
        const signup = await authClient.signUp.email({
          name,
          email: email.trim().toLowerCase(),
          password,
        });

        if (signup.error) {
          const code = signup.error.code ?? "";
          if (code.includes("USER_ALREADY_EXISTS")) {
            setFormError("Este e-mail já possui conta. Entre pelo login e conclua o cadastro.");
          } else {
            setFormError(signup.error.message || "Não foi possível criar sua conta.");
          }
          return;
        }
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          officeName,
          phone,
          oabNumber,
          oabState,
          postalCode: cep,
          street: address.street,
          number,
          complement,
          district: address.district,
          city: address.city,
          state: address.state,
          planSlug: selectedPlanSlug,
          billingCycle: cycle,
          acceptedTerms: true,
          acknowledgedPrivacy: true,
        }),
      });

      if (!response.ok) {
        setFormError(
          "A conta foi criada, mas não concluímos o escritório. Seus dados de acesso foram preservados; tente novamente.",
        );
        return;
      }

      // O escritório existe, mas permanece pendente até a confirmação do e-mail.
      // O endpoint aplica cooldown de reenvio e nunca expõe o código no navegador.
      await fetch("/api/security/email-verification/start", { method: "POST" }).catch(() => null);
      router.push("/verificar-email?next=%2Fapp%2Fdashboard");
      router.refresh();
    } catch {
      setFormError("Não foi possível concluir o cadastro agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8 || digits === lastFetchedCep.current) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setCepStatus("loading");
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("CEP não encontrado");
        const data = await response.json();
        if (data.erro) throw new Error("CEP não encontrado");

        lastFetchedCep.current = digits;
        setAddress({
          street: data.logradouro || "",
          district: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        });
        setCepStatus("ok");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setAddress(emptyAddress);
        setCepStatus("error");
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cep]);

  return (
    <div className={styles.card}>
      <button
        className={styles.closeButton}
        type="button"
        onClick={closeCadastro}
        aria-label="Fechar cadastro"
      >
        ×
      </button>

      <span className={styles.authEyebrow}>Cadastro</span>
      <h2>Crie sua conta</h2>
      <p className={styles.cardLead}>Preencha seus dados e escolha o plano do escritório.</p>

      <form className={styles.form} onSubmit={submitPreview} noValidate>
        <div className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <strong>Escolher o plano</strong>
          </div>

          <div className={styles.billingToggle} role="group" aria-label="Forma de cobrança">
            <button
              className={cycle === "annual" ? styles.activeBilling : ""}
              type="button"
              onClick={() => setCycle("annual")}
            >
              Anual
            </button>
            <button
              className={cycle === "monthly" ? styles.activeBilling : ""}
              type="button"
              onClick={() => setCycle("monthly")}
            >
              Mensal
            </button>
          </div>

          <div className={styles.planPicker}>
            {plans.map((plan) => {
              const isSelected = plan.slug === selectedPlanSlug;
              const isFree = plan.slug === "free";
              const price = getDisplayedMonthlyPrice(plan, cycle);
              return (
                <button
                  key={plan.slug}
                  className={`${styles.planOption} ${isSelected ? styles.selectedPlan : ""}`}
                  type="button"
                  onClick={() => setSelectedPlanSlug(plan.slug)}
                  aria-pressed={isSelected}
                >
                  <span className={styles.planOptionTop}>
                    <strong>{plan.name}</strong>
                    {isSelected && <b>Selecionado</b>}
                  </span>
                  <span className={styles.planOptionPrice}>
                    {isFree ? `Grátis por ${plan.freeMonths} meses` : currency(price)} {!isFree && <small>/mês</small>}
                  </span>
                  <span className={styles.planOptionMeta}>
                    {plan.users} usuário{plan.users > 1 ? "s" : ""} · {plan.oabs} OAB{plan.oabs > 1 ? "s" : ""} · {plan.registeredProcessLimit === "unlimited" ? "processos cadastrados sem limite comercial inicial" : `${plan.registeredProcessLimit} processos`}
                    {!isFree && cycle === "annual" && ` · economize ${String(annualSavingsPercent(plan)).replace(".", ",")}%`}
                    {!isFree && launchPromotionActive && ` · após 30/06/2027: ${currency(plan.pricing.standardMonthly)}/mês`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <strong>Dados do escritório</strong>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="name">Nome</label>
              <input id="name" name="name" autoComplete="name" placeholder="Nome completo" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="office">Escritório</label>
              <input id="office" name="office" autoComplete="organization" placeholder="Nome do escritório" required />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                className={submitted && !email ? styles.invalidField : ""}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@escritorio.com.br"
                required
              />
              {submitted && !email && <small className={styles.errorText}>Informe o e-mail.</small>}
            </div>
            <div className={styles.field}>
              <label htmlFor="email-confirm">Confirme seu e-mail</label>
              <input
                id="email-confirm"
                name="emailConfirm"
                className={emailMismatch || (submitted && !emailConfirm) ? styles.invalidField : ""}
                type="email"
                autoComplete="email"
                value={emailConfirm}
                onChange={(event) => setEmailConfirm(event.target.value)}
                placeholder="Repita o e-mail"
                required
              />
              {emailMismatch && <small className={styles.errorText}>Os e-mails precisam ser iguais.</small>}
              {submitted && !emailConfirm && !emailMismatch && (
                <small className={styles.errorText}>Confirme o e-mail.</small>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="phone">WhatsApp</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="oab">OAB</label>
              <input id="oab" name="oab" placeholder="123456" required />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="uf">UF da OAB</label>
            <select id="uf" name="oabUf" defaultValue="SP" required>
              <option value="AC">AC - Acre</option>
              <option value="AL">AL - Alagoas</option>
              <option value="AP">AP - Amapá</option>
              <option value="AM">AM - Amazonas</option>
              <option value="BA">BA - Bahia</option>
              <option value="CE">CE - Ceará</option>
              <option value="DF">DF - Distrito Federal</option>
              <option value="ES">ES - Espírito Santo</option>
              <option value="GO">GO - Goiás</option>
              <option value="MA">MA - Maranhão</option>
              <option value="MT">MT - Mato Grosso</option>
              <option value="MS">MS - Mato Grosso do Sul</option>
              <option value="MG">MG - Minas Gerais</option>
              <option value="PA">PA - Pará</option>
              <option value="PB">PB - Paraíba</option>
              <option value="PR">PR - Paraná</option>
              <option value="PE">PE - Pernambuco</option>
              <option value="PI">PI - Piauí</option>
              <option value="RJ">RJ - Rio de Janeiro</option>
              <option value="RN">RN - Rio Grande do Norte</option>
              <option value="RS">RS - Rio Grande do Sul</option>
              <option value="RO">RO - Rondônia</option>
              <option value="RR">RR - Roraima</option>
              <option value="SC">SC - Santa Catarina</option>
              <option value="SP">SP - São Paulo</option>
              <option value="SE">SE - Sergipe</option>
              <option value="TO">TO - Tocantins</option>
            </select>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <strong>Endereço</strong>
            <span>Digite o CEP para preencher logradouro, bairro, cidade e UF.</span>
          </div>

          <div className={styles.rowCompact}>
            <div className={styles.field}>
              <label htmlFor="cep">CEP</label>
              <input
                id="cep"
                name="cep"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cep}
                onChange={(event) => {
                  setCep(formatCep(event.target.value));
                  lastFetchedCep.current = "";
                  setCepStatus("idle");
                }}
                placeholder="00000-000"
                required
              />
              <small className={`${styles.cepMessage} ${cepStatus === "error" ? styles.errorText : ""}`}>
                {cepStatus === "loading" && "Buscando endereço..."}
                {cepStatus === "ok" && "Endereço encontrado."}
                {cepStatus === "error" && "CEP não encontrado. Preencha o endereço manualmente."}
              </small>
            </div>
            <div className={styles.field}>
              <label htmlFor="number">Número</label>
              <input id="number" name="number" autoComplete="address-line2" placeholder="123" required />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="street">Logradouro</label>
            <input
              id="street"
              name="street"
              autoComplete="address-line1"
              value={address.street}
              onChange={(event) => setAddress({ ...address, street: event.target.value })}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="district">Bairro</label>
              <input
                id="district"
                name="district"
                value={address.district}
                onChange={(event) => setAddress({ ...address, district: event.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="complement">Complemento <span className={styles.optional}>opcional</span></label>
              <input id="complement" name="complement" autoComplete="address-line3" placeholder="Sala, conjunto, andar..." />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="city">Cidade</label>
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                value={address.city}
                onChange={(event) => setAddress({ ...address, city: event.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="state">UF</label>
              <input
                id="state"
                name="state"
                autoComplete="address-level1"
                value={address.state}
                onChange={(event) =>
                  setAddress({ ...address, state: event.target.value.toUpperCase().slice(0, 2) })
                }
                maxLength={2}
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <strong>Acesso</strong>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="password">Crie sua senha</label>
              <input
                id="password"
                name="password"
                className={passwordTooShort || (submitted && !password) ? styles.invalidField : ""}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                required
              />
              {passwordTooShort && <small className={styles.errorText}>Use pelo menos 8 caracteres.</small>}
              {submitted && !password && <small className={styles.errorText}>Crie uma senha.</small>}
            </div>
            <div className={styles.field}>
              <label htmlFor="password-confirm">Confirme sua senha</label>
              <input
                id="password-confirm"
                name="passwordConfirm"
                className={passwordMismatch || (submitted && !passwordConfirm) ? styles.invalidField : ""}
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Repita a senha"
                required
              />
              {passwordMismatch && <small className={styles.errorText}>As senhas precisam ser iguais.</small>}
              {submitted && !passwordConfirm && !passwordMismatch && (
                <small className={styles.errorText}>Confirme a senha.</small>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <strong>Termos e privacidade</strong>
          </div>

          <label className={`${styles.consentRow} ${submitted && !acceptedTerms ? styles.consentError : ""}`}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso e Contratação</Link>.
            </span>
          </label>

          <label className={`${styles.consentRow} ${submitted && !acknowledgedPrivacy ? styles.consentError : ""}`}>
            <input
              type="checkbox"
              checked={acknowledgedPrivacy}
              onChange={(event) => setAcknowledgedPrivacy(event.target.checked)}
            />
            <span>
              Li e estou ciente da{" "}
              <Link href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade e LGPD</Link>.
            </span>
          </label>
        </div>

        {formError && <div className={styles.formError} role="alert">{formError}</div>}

        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Criando seu escritório..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}
