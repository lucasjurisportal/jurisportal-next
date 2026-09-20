import assert from "node:assert/strict";
import test from "node:test";
import { digitsOnly, isValidCnpj, isValidCpf } from "./tax-id";

test("normaliza documento para apenas dígitos", () => {
  assert.equal(digitsOnly("123.456.789-00"), "12345678900");
});

test("rejeita CPF repetido", () => {
  assert.equal(isValidCpf("111.111.111-11"), false);
});

test("aceita CPF conhecido válido para teste algorítmico", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
});

test("rejeita CNPJ repetido", () => {
  assert.equal(isValidCnpj("11.111.111/1111-11"), false);
});

test("aceita CNPJ conhecido válido para teste algorítmico", () => {
  assert.equal(isValidCnpj("04.252.011/0001-10"), true);
});
