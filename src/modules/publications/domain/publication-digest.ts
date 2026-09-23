export type DigestCommunication = {
  publicationId: string;
  kind: string;
  communicationType: string;
  cnj: string | null;
  court: string | null;
  judicialBody?: string | null;
  documentType?: string | null;
  parties?: Array<{ name: string; role: string }>;
  summary: string | null;
  sourceUrl: string | null;
};
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderItem(item: DigestCommunication): { text: string; html: string } {
  const title = item.communicationType || (item.kind === "INTIMATION" ? "Intimação" : "Publicação");
  const cnj = item.cnj || "Número não informado";
  const summary = item.summary || "Confira o texto integral no Jurisportal.";
  const court = item.court || "Tribunal não informado";
  const judicialBody = item.judicialBody || "Órgão não informado";
  const parties = (item.parties ?? []).filter((party) => party.name && party.name !== "Não informado")
    .slice(0, 8).map((party) => `${party.name}${party.role ? ` (${party.role})` : ""}`).join("; ");
  const documentType = item.documentType ? `
Documento: ${item.documentType}` : "";
  return {
    text: `${title}\nProcesso: ${cnj}\nTribunal: ${court}\nÓrgão: ${judicialBody}${documentType}${parties ? `\nPartes: ${parties}` : ""}\nResumo: ${summary}`,
    html: `<li><strong>${escapeHtml(title)}</strong><br/>Processo: ${escapeHtml(cnj)}<br/>Tribunal: ${escapeHtml(court)}<br/>Órgão: ${escapeHtml(judicialBody)}${item.documentType ? `<br/>Documento: ${escapeHtml(item.documentType)}` : ""}${parties ? `<br/>Partes: ${escapeHtml(parties)}` : ""}<br/>Resumo: ${escapeHtml(summary)}</li>`,
  };
}
/** A mesma comunicação destinada a duas OABs do advogado aparece só uma vez no e-mail. */
export function renderPublicationDigest(input: { name: string; items: DigestCommunication[]; baseUrl?: string | null }) {
  const byId = new Map(input.items.map((item) => [item.publicationId, item]));
  const items = [...byId.values()];
  const intims = items.filter((item) => item.kind === "INTIMATION");
  const other = items.filter((item) => item.kind !== "INTIMATION");
  const groups = [{ title: "Intimações", items: intims }, { title: "Publicações", items: other }]
    .filter((group) => group.items.length);
  const subject = `Jurisportal | ${items.length} nova${items.length === 1 ? " comunicação" : "s comunicações"}`;
  const text = [
    `Olá, ${input.name}!`,
    `Encontramos ${items.length} nova${items.length === 1 ? " comunicação" : "s comunicações"} para sua OAB.`,
    ...groups.flatMap((group) => [group.title.toUpperCase(), ...group.items.map((item) => renderItem(item).text)]),
    "Confira o texto integral e os eventuais prazos no Jurisportal. O resumo não substitui a publicação oficial.",
    input.baseUrl ? `Acessar: ${input.baseUrl}/app/publicacoes` : "",
  ].filter(Boolean).join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;line-height:1.5;color:#1e293b"><h2>Publicações e intimações</h2><p>Olá, ${escapeHtml(input.name)}!</p><p>Encontramos ${items.length} nova${items.length === 1 ? " comunicação" : "s comunicações"} para sua OAB.</p>${groups.map((group) => `<h3>${escapeHtml(group.title)}</h3><ol>${group.items.map((item) => renderItem(item).html).join("")}</ol>`).join("")}<p>Confira o texto integral e os eventuais prazos no Jurisportal. O resumo não substitui a publicação oficial.</p>${input.baseUrl ? `<p><a href="${escapeHtml(input.baseUrl)}/app/publicacoes">Acessar publicações</a></p>` : ""}</div>`;
  return { subject, text, html, communicationCount: items.length };
}
export function safePublicAppUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || (url.protocol !== "https:"
      && !(url.protocol === "http:" && url.hostname === "localhost"))) return null;
    return url.origin;
  } catch { return null; }
}
