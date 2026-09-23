"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Team.module.css";

type Member = {
  userId: string;
  name: string;
  email: string;
  mobile: string;
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
  mobile: "",
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [info, setInfo] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Confira nome, OAB, UF, função e nível de acesso. Depois de criar o auxiliar, somente e-mail e celular poderão ser editados nesta área. Deseja salvar?")) return;
    setError("");
    setInfo("");
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

  function beginEdit(member: Member) {
    setEditingUserId(member.userId);
    setEditEmail(member.email);
    setEditMobile(member.mobile);
    setError("");
    setInfo("");
  }

  async function saveContact(event: FormEvent, member: Member) {
    event.preventDefault();
    const emailChanged = editEmail.trim().toLowerCase() !== member.email;
    if (emailChanged && !window.confirm(
      "O e-mail de acesso será alterado. O auxiliar terá que entrar novamente e confirmar o novo endereço. Deseja continuar?",
    )) return;
    setEditBusy(true);
    setError("");
    setInfo("");
    try {
      const response = await fetch(`/api/team/${member.userId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: editEmail, mobile: editMobile }),
      });
      const data = await response.json().catch(() => null) as { error?: string; emailChanged?: boolean } | null;
      if (!response.ok) {
        const messages: Record<string, string> = {
          TEAM_EMAIL_ALREADY_IN_USE: "Este e-mail já está cadastrado no Jurisportal.",
          TEAM_INVALID_CONTACT: "Confira o e-mail e informe um celular com DDD, ou deixe o celular vazio.",
          TEAM_OWNER_REQUIRED: "Somente o proprietário pode atualizar os contatos.",
          TEAM_EMAIL_DELIVERY_NOT_CONFIGURED: "O envio de e-mail ainda não está disponível. O e-mail não foi alterado.",
        };
        setError(messages[data?.error ?? ""] ?? "Não foi possível atualizar os contatos.");
        return;
      }
      setEditingUserId(null);
      setInfo(data?.emailChanged
        ? "Contatos atualizados. O auxiliar precisará entrar novamente e confirmar o novo e-mail."
        : "Celular atualizado.");
      router.refresh();
    } finally { setEditBusy(false); }
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
          <span>Usuários</span>
          <strong>
            {userUsage} / {userLimit}
          </strong>
          
        </div>
        <div className={styles.summaryCard}>
          <span>OABs</span>
          <strong>
            {oabUsage} / {oabLimit}
          </strong>
          
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
      {info ? <div className={styles.notice}>{info}</div> : null}

      {open ? (
        <form className={styles.form} onSubmit={submit}>
          <h2>Criar auxiliar</h2>
          <p className={styles.formLead}>
            Confira nome, OAB, UF, função e nível de acesso antes de salvar. Depois do cadastro,
            apenas o e-mail e o celular poderão ser editados nesta área. O auxiliar terá que trocar a senha no primeiro acesso.
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
              Celular
              <input
                type="tel"
                inputMode="tel"
                value={form.mobile}
                onChange={(event) => setForm({ ...form, mobile: event.target.value })}
                placeholder="(11) 99999-9999"
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
          <strong>Equipe</strong>
          <span>OAB vinculada</span>
          <span>Ações</span>
        </div>
        {members.map((member) => (
          <div className={styles.row} key={member.userId}>
            <div>
              <strong>{member.name}</strong>
              <span>{member.email}</span>
              {member.mobile ? <span>Celular: {member.mobile}</span> : null}
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
              
            </div>
            <div className={styles.rowActions}>
              {isOwner && member.role !== "owner" ? (
                <button className={styles.primary} type="button" onClick={() => beginEdit(member)}>
                  Editar
                </button>
              ) : null}
              {isOwner && member.role !== "owner" ? (
                <button
                  className={styles.danger}
                  onClick={() => void remove(member.userId, member.name)}
                >
                  Remover
                </button>
              ) : null}
            </div>
            {isOwner && editingUserId === member.userId ? <form className={styles.contactForm}
              onSubmit={(event) => void saveContact(event, member)}>
              <label>E-mail<input type="email" required value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)} /></label>
              <label>Celular<input type="tel" inputMode="tel" value={editMobile}
                onChange={(event) => setEditMobile(event.target.value)} placeholder="(11) 99999-9999" /></label>
              <div className={styles.contactActions}>
                <button className={styles.primary} disabled={editBusy} type="submit">{editBusy ? "Salvando..." : "Salvar"}</button>
                <button type="button" className={styles.secondary} onClick={() => setEditingUserId(null)}>Cancelar</button>
              </div>
            </form> : null}
          </div>
        ))}
      </section>
    </div>
  );
}
