import test from "node:test";
import assert from "node:assert/strict";
import { APP_THEMES, DEFAULT_APP_THEME, validAppTheme, themeStorageKey } from "./theme";

test("dez temas únicos, com branco e azul como padrão", () => {
  assert.equal(APP_THEMES.length, 10);
  assert.equal(new Set(APP_THEMES.map((theme) => theme.id)).size, 10);
  assert.equal(APP_THEMES[0].id, DEFAULT_APP_THEME);
});
test("temas desconhecidos voltam ao padrão, sem aceitar CSS arbitrário", () => {
  assert.equal(validAppTheme("indigo"), "indigo");
  assert.equal(validAppTheme("#fff; color:red"), "blue");
  assert.equal(validAppTheme(null), "blue");
});
test("preferência isolada pelo ID do usuário no navegador", () => {
  assert.notEqual(themeStorageKey("a"), themeStorageKey("b"));
});

test("salmão tem amostra rosa e não laranja/terracota", () => {
  const salmon = APP_THEMES.find((theme) => theme.id === "salmon");
  assert.ok(salmon);
  assert.equal(salmon.swatch, "#da849d");
  assert.equal(salmon.surface, "#fff4f7");
});

test("a moldura usa as variáveis de cor selecionadas", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const css = readFileSync(join(process.cwd(), "src/components/app-shell/AppShell.module.css"), "utf8");
  for (const name of ["--jp-canvas", "--jp-sidebar-start", "--jp-sidebar-end", "--jp-nav-active", "--jp-header"]) {
    assert.match(css, new RegExp(`var\\(${name},`));
  }
  for (const theme of APP_THEMES) {
    assert.ok(css.includes(`.shell[data-jp-theme="${theme.id}"]`), `Tema ${theme.id} ausente do CSS`);
  }
});
