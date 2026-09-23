import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOabQueryVariants,
  extractExplicitDates,
  normalizeDjenItem,
  normalizeLawyerName,
  publicationTargetsOab,
  sanitizeDjenContent,
  officialDjenUrl,
  summarizeDjenContent,
} from "./djen-publication";

test("sanitiza HTML externo e preserva texto", () => {
  const value = sanitizeDjenContent('<div class="fixed"><script>alert(1)</script>Prazo em <b>20/09/2026</b></div>');
  assert.equal(value, "Prazo em 20/09/2026");
});

test("localiza datas expressas sem interpretar prazo", () => {
  assert.deepEqual(extractExplicitDates("Audiência 20/09/2026. Retorno 2026-09-21. Inválida 31/02/2026."), ["2026-09-20", "2026-09-21"]);
});

test("normaliza item realista do DJeN e CNJ", () => {
  const pub = normalizeDjenItem({
    id: 44,
    hash: "abc",
    numeroprocessocommascara: "1000879-08.2014.8.26.0462",
    siglaTribunal: "TJSP",
    tipoComunicacao: "Intimação",
    nomeOrgao: "1ª Vara",
    datadisponibilizacao: "2026-09-15",
    texto: "<p>Manifestar até 20/09/2026</p>",
    destinatarioadvogados: [{ advogado: { nome: "Advogado", numero_oab: "123456-A", uf_oab: "SP" } }],
  });
  assert.equal(pub.kind, "INTIMATION");
  assert.equal(pub.processNumberNormalized, "10008790820148260462");
  assert.deepEqual(pub.explicitDates, ["2026-09-20"]);
  assert.equal(publicationTargetsOab(pub, "123456A", "sp", "Advogado"), true);
});

test("consulta somente variantes da inscrição efetivamente cadastrada", () => {
  const values = buildOabQueryVariants("123456", "123456");
  assert.deepEqual(values, ["123456"]);
  const withSuffix = buildOabQueryVariants("123456-A", "123456A");
  assert.ok(withSuffix.includes("123456-A"));
  assert.ok(withSuffix.includes("123456A"));
  assert.equal(withSuffix.includes("123456-B"), false);
});

test("preserva cancelamento informado pela origem", () => {
  const pub = normalizeDjenItem({
    id: 45,
    hash: "cancelled-hash",
    numeroprocessocommascara: "1000879-08.2014.8.26.0462",
    tipoComunicacao: "Publicação",
    data_disponibilizacao: "2026-09-15",
    texto: "Comunicação cancelada",
    ativo: false,
    motivo_cancelamento: "Cancelada na origem",
  });
  assert.equal(pub.sourceStatus, "CANCELLED");
  assert.equal(pub.cancellationReason, "Cancelada na origem");
});


test("OAB, UF e nome precisam coincidir para associação automática", () => {
  const pub = normalizeDjenItem({
    id: 99, datadisponibilizacao: "2026-09-15", texto: "Intimação",
    destinatarioadvogados: [{ advogado: { nome: "João da Silva", numero_oab: "00123-A", uf_oab: "SP" } }],
  });
  assert.equal(normalizeLawyerName(" João  dá SILVA "), "JOAO DA SILVA");
  assert.equal(publicationTargetsOab(pub, "00123-A", "SP", "Joao da Silva"), true);
  assert.equal(publicationTargetsOab(pub, "00123", "SP", "João da Silva"), false);
  assert.equal(publicationTargetsOab(pub, "00123-B", "SP", "João da Silva"), false);
  assert.equal(publicationTargetsOab(pub, "00123-A", "RJ", "João da Silva"), false);
  assert.equal(publicationTargetsOab(pub, "00123-A", "SP", "João Pereira"), false);
  assert.equal(publicationTargetsOab(pub, "00123-A", "SP", ""), false);
});

test("registro sem advogados não comprova a inscrição do escritório", () => {
  const pub = normalizeDjenItem({ id: 100, datadisponibilizacao: "2026-09-15", texto: "Publicação" });
  assert.equal(publicationTargetsOab(pub, "12345", "SP", "João da Silva"), false);
});


test("IDs oficiais estáveis entre consulta OAB e nome e cancela sem duplicar CNJ", () => {
  const base = { id: 777, hash: "hash-1", datadisponibilizacao: "2026-09-15",
    numero_processo: "10008790820148260462", texto: "<p>Intimação</p>" };
  const first = normalizeDjenItem(base);
  const updated = normalizeDjenItem({ ...base, hash: "hash-novo", ativo: false });
  const another = normalizeDjenItem({ ...base, id: 778 });
  assert.equal(first.externalKey, "id:777");
  assert.equal(updated.externalKey, first.externalKey);
  assert.notEqual(another.externalKey, first.externalKey);
  assert.equal(updated.sourceStatus, "CANCELLED");
});

test("origem oficial: URL externa não vira link clicável", () => {
  assert.equal(officialDjenUrl("javascript:alert(1)"), null);
  assert.equal(officialDjenUrl("https://jus.br.evil.example/"), null);
  assert.equal(officialDjenUrl("http://tj.sp.jus.br/ato"), null);
  assert.equal(officialDjenUrl("https://tj.sp.jus.br/ato"), "https://tj.sp.jus.br/ato");
});

test("resumo fiel limitado e sem interpretação de prazo", () => {
  assert.equal(summarizeDjenContent("  Ato  publicado   hoje  "), "Ato publicado hoje");
  assert.ok(summarizeDjenContent("texto ".repeat(100)).length <= 320);
});

// Regressao de captura: a origem pode apresentar data no formato brasileiro;
// a disponibilizacao nao pode ser inventada usando outro campo juridico.
test("aceita variantes explicitas da data de disponibilizacao", () => {
  for (const [field, value] of [
    ["datadisponibilizacao", "2026-09-22T00:00:00.000Z"],
    ["dataDisponibilizacao", "22/09/2026"],
    ["data_disponibilizacao", "2026-09-22"],
  ] as const) {
    const pub = normalizeDjenItem({ id: 123, [field]: value, texto: "Comunicação" });
    assert.equal(pub.publicationDate, "2026-09-22");
  }
});

test("falha com motivo explicito se faltar disponibilizacao, sem inventar dia", () => {
  assert.throws(() => normalizeDjenItem({ id: 124, data_publicacao: "2026-09-23", texto: "Comunicação" }),
    /DJEN_PUBLICATION_DATE_MISSING/);
  assert.throws(() => normalizeDjenItem({ id: 125, datadisponibilizacao: "31/02/2026" }),
    /DJEN_PUBLICATION_DATE_INVALID/);
  assert.throws(() => normalizeDjenItem(null), /DJEN_PUBLICATION_DATE_MISSING/);
});
