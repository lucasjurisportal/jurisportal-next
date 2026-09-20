import assert from "node:assert/strict";
import test from "node:test";
import { helpModuleForPath, helpModules } from "./help-content";

test("mapeia os módulos principais para o tutorial correto", () => {
  assert.equal(helpModuleForPath("/app/dashboard")?.key, "dashboard");
  assert.equal(helpModuleForPath("/app/processos/abc")?.key, "processos");
  assert.equal(helpModuleForPath("/app/publicacoes/abc")?.key, "publicacoes");
  assert.equal(helpModuleForPath("/app/configuracoes")?.key, "configuracoes");
  assert.equal(helpModuleForPath("/app/modelos/abc")?.key, "modelos");
});

test("ajuda não tenta abrir tutorial sobre a própria central de ajuda", () => {
  assert.equal(helpModuleForPath("/app/ajuda"), null);
});

test("todos os tutoriais possuem instruções e boas práticas", () => {
  for (const module of helpModules) {
    assert.ok(module.steps.length >= 3, `${module.key} precisa de passos`);
    assert.ok(module.tips.length >= 1, `${module.key} precisa de boas práticas`);
  }
});
