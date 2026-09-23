import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDjenItem } from "./djen-publication";
import { djenCandidateReason, isPotentialDjenCandidate } from "./djen-identity";

function pub(name: string, number: string, uf: string) {
  return normalizeDjenItem({ id: 1, datadisponibilizacao: "2026-09-18", texto: "Ato",
    destinatarioadvogados: [{ advogado: { nome: name, numero_oab: number, uf_oab: uf } }] });
}

test("homônimo com outra OAB e mesma UF é candidato, não match automático", () => {
  const publication = pub("João da Silva", "1234-A", "SP");
  assert.equal(isPotentialDjenCandidate({ publication, oab: "9999", state: "SP",
    registeredName: "João da Silva", mode: "NAME" }), true);
  assert.equal(djenCandidateReason(publication, "9999", "SP", "João da Silva"), "OAB_DIVERGENTE_OU_HOMONIMO");
});

test("nome diverge mesmo que a OAB e UF coincidam: exige revisão", () => {
  const publication = pub("Maria da Silva", "1234-A", "SP");
  assert.equal(isPotentialDjenCandidate({ publication, oab: "1234A", state: "SP",
    registeredName: "Maria Souza", mode: "OAB" }), true);
  assert.equal(djenCandidateReason(publication, "1234A", "SP", "Maria Souza"), "NOME_DIVERGENTE");
});

test("OAB consultada com identidade divergente aparece para revisão, nunca como comprovada", () => {
  const publication = pub("Nome Distinto", "1234", "RJ");
  assert.equal(isPotentialDjenCandidate({ publication, oab: "1234", state: "SP",
    registeredName: "João da Silva", mode: "OAB" }), true);
  assert.equal(djenCandidateReason(publication, "1234", "SP", "João da Silva"), "IDENTIDADE_NAO_CONFIRMADA");
});

test("busca ampla por nome não sugere outro advogado com nome divergente", () => {
  const publication = pub("Pessoa Diferente", "1234", "RJ");
  assert.equal(isPotentialDjenCandidate({ publication, oab: "1234", state: "SP",
    registeredName: "João da Silva", mode: "NAME" }), false);
});
