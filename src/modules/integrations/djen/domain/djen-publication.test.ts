import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOabQueryVariants,
  extractExplicitDates,
  normalizeDjenItem,
  normalizeLawyerName,
  publicationTargetsOab,
  sanitizeDjenContent,
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

test("gera variantes defensivas para OAB numérica", () => {
  const values = buildOabQueryVariants("123456", "123456");
  assert.ok(values.includes("123456"));
  assert.ok(values.includes("123456-A"));
  assert.ok(values.includes("123456-O"));
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
