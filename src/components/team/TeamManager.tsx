"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Team.module.css";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: string;
  accessLevel: string;
  jobTitle: string | null;
  oabState: string | null;
  oabNumber: string | null;
  createdAt: string | Date;
};

type Props = {
  members: Member[];
  userLimit: number;
  oabLimit: number;
  userUsage: number;
  oabUsage: number;
  isOwner: boolean;
};

const initialForm = {
  name: "",
  email: "",
  jobTitle: "",
  accessLevel: "LEVEL_1",
  oabState: "",
  oabNumber: "",
  provisionalPassword: "",
};

export function TeamManager({
  members,
  userLimit,
  oabLimit,
  userUsage,
  oabUsage,
  isOwner,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        const messages: Record<string, string> = {
          TEAM_PLAN_USER_LIMIT_REACHED:
            "O limite de usuários do plano foi atingido. Faça upgrade para adicionar outro integrante.",
          TEAM_PLAN_OAB_LIMIT_REACHED:
            "O limite de OABs do plano foi atingido. Cada integrante precisa de uma OAB própria cadastrada.",
          TEAM_EMAIL_ALREADY_IN_USE:
            "Este e-mail já está vinculado a uma conta do Jurisportal.",
          TEAM_OAB_ALREADY_IN_USE:
            "Esta OAB já está cadastrada neste escritório e não pode ser reutilizada em outro usuário.",
          TEAM_INVALID_OAB: "Informe uma OAB e UF válidas.",
          INVALID_TEAM_MEMBER: "Preencha todos os campos obrigatórios, inclusive OAB e UF.",
          TEAM_OWNER_REQUIRED: "Somente o proprietário pode adicionar integrantes.",
        };
        setError(messages[data.error ?? ""] ?? "Não foi possível criar o usuário.");
        return;
      }

      setOpen(false);
      setForm(initialForm);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string, name: string) {
    if (!confirm(`Remover ${name} da equipe? O acesso será encerrado, mas o histórico permanecerá.`)) {
      return;
    }
    const response = await fetch(`/api/team/${userId}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Não foi possível remover o integrante.");
      return;
    }
    router.refresh();
  }

  const userFull = userUsage >= userLimit;
  const oabFull = oabUsage >= oabLimit;
  const creationBlocked = userFull || oabFull;

  return (
    <div className={styles.wrap}>
      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Usuários do plano</span>
          <strong>
            {userUsage} / {userLimit}
          </strong>
          <small>
            {userFull
              ? "Limite de usuários atingido."
              : `${userLimit - userUsage} vaga(s) de usuário disponível(is).`}
          </small>
        </div>
        <div className={styles.summaryCard}>
          <span>OABs do plano</span>
          <strong>
            {oabUsage} / {oabLimit}
          </strong>
          <small>
            {oabFull
              ? "Limite de OABs atingido."
              : `${oabLimit - oabUsage} vaga(s) de OAB disponível(is).`}
          </small>
        </div>
        {isOwner ? (
          <button
            className={styles.primary}
            disabled={creationBlocked}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Cancelar" : "Novo usuário"}
          </button>
        ) : null}
      </section>

      {creationBlocked ? (
        <div className={styles.notice}>
          Para criar um auxiliar, o plano precisa ter ao mesmo tempo uma vaga de usuário e uma vaga
          de OAB disponíveis.
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {open ? (
        <form className={styles.form} onSubmit={submit}>
          <h2>Criar auxiliar</h2>
          <p className={styles.formLead}>
            A OAB é obrigatória e será vinculada a este usuário. Nesta fase ela não pode ser trocada
            pela tela de Equipe, evitando reutilização de uma mesma vaga para OABs diferentes.
          </p>
          <div className={styles.grid}>
            <label>
              Nome
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <label>
              Função/cargo
              <input
                value={form.jobTitle}
                onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
                placeholder="Ex.: Advogado auxiliar"
              />
            </label>
            <label>
              Nível de acesso
              <select
                value={form.accessLevel}
                onChange={(event) => setForm({ ...form, accessLevel: event.target.value })}
              >
                <option value="LEVEL_2">Nível 2, advogado auxiliar</option>
                <option value="LEVEL_1">Nível 1, estagiário/apoio</option>
              </select>
            </label>
            <label>
              UF da OAB
              <input
                maxLength={2}
                value={form.oabState}
                onChange={(event) =>
                  setForm({ ...form, oabState: event.target.value.toUpperCase() })
                }
                placeholder="SP"
                required
              />
            </label>
            <label>
              Número da OAB
              <input
                value={form.oabNumber}
                onChange={(event) => setForm({ ...form, oabNumber: event.target.value })}
                required
              />
            </label>
            <label className={styles.full}>
              Senha provisória
              <input
                type="password"
                minLength={8}
                value={form.provisionalPassword}
                onChange={(event) =>
                  setForm({ ...form, provisionalPassword: event.target.value })
                }
                required
              />
              <small>O auxiliar será obrigado a trocar esta senha no primeiro acesso.</small>
            </label>
          </div>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Criando..." : "Criar usuário"}
          </button>
        </form>
      ) : null}

      <section className={styles.list}>
        <div className={styles.listHead}>
          <strong>Integrantes</strong>
          <span>OAB vinculada</span>
          <span>Ações</span>
        </div>
        {members.map((member) => (
          <div className={styles.row} key={member.userId}>
            <div>
              <strong>{member.name}</strong>
              <span>{member.email}</span>
              <span>
                {member.role === "owner"
                  ? "Proprietário"
                  : member.accessLevel === "LEVEL_2"
                    ? "Nível 2"
                    : "Nível 1"}
                {member.jobTitle ? ` · ${member.jobTitle}` : ""}
              </span>
            </div>
            <div>
              <strong>
                {member.oabNumber && member.oabState
                  ? `${member.oabNumber}/${member.oabState}`
                  : "OAB não localizada"}
              </strong>
              <span>{member.role === "owner" ? "OAB do proprietário" : "OAB do auxiliar"}</span>
            </div>
            <div className={styles.rowActions}>
              {isOwner && member.role !== "owner" ? (
                <button
                  className={styles.danger}
                  onClick={() => void remove(member.userId, member.name)}
                >
                  Remover
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
