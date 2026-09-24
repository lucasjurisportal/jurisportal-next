/** npm run diagnose:datajud:network ; não usa CNJ, API key ou banco. */
import { lookup } from "node:dns/promises";
import { connect as connectTcp } from "node:net";
import { connect as connectTls } from "node:tls";

const HOST = "api-publica.datajud.cnj.jus.br";
const TIMEOUT = 7_000;
const safeError = (error: unknown) => error && typeof error === "object" && "code" in error
  && typeof error.code === "string" ? error.code.slice(0, 40) : "UNCLASSIFIED_ERROR";

function tcp(family: 4 | 6): Promise<string> {
  return new Promise((resolve) => {
    const socket = connectTcp({ host: HOST, port: 443, family, timeout: TIMEOUT });
    let done = false;
    const finish = (message: string) => { if (done) return; done = true; socket.destroy(); resolve(message); };
    socket.once("connect", () => finish("OK"));
    socket.once("timeout", () => finish("TIMEOUT"));
    socket.once("error", (err) => finish(safeError(err)));
  });
}
async function tlsIpv4(): Promise<string> {
  let ipv4: string;

  try {
    ({ address: ipv4 } = await lookup(HOST, { family: 4 }));
  } catch (error) {
    return `DNS_${safeError(error)}`;
  }

  return new Promise((resolve) => {
    const socket = connectTls({
      host: ipv4,
      port: 443,
      servername: HOST,
      timeout: TIMEOUT,
      rejectUnauthorized: true,
    });

    let done = false;

    const finish = (message: string) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(message);
    };

    socket.once("secureConnect", () => finish("OK"));
    socket.once("timeout", () => finish("TIMEOUT"));
    socket.once("error", (err) => finish(safeError(err)));
  });
}

async function main() {
  console.log("Diagnóstico de rede DataJud (sem CNJ e sem chave)");
  let families: number[];
  try {
    const addresses = await Promise.race([
      lookup(HOST, { all: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DNS_TIMEOUT")), TIMEOUT)),
    ]);
    families = addresses.map((item) => item.family);
    console.log("DNS:", families.includes(4) ? "IPv4 encontrado" : "sem IPv4", "/", families.includes(6) ? "IPv6 encontrado" : "sem IPv6");
  } catch (error) {
    console.log("DNS:", safeError(error) === "UNCLASSIFIED_ERROR" && error instanceof Error && error.message === "DNS_TIMEOUT" ? "TIMEOUT" : safeError(error));
    process.exitCode = 1; return;
  }
  if (families.includes(4)) {
    const tcp4 = await tcp(4);
    console.log("TCP IPv4 porta 443:", tcp4);
    if (tcp4 === "OK") console.log("TLS IPv4 certificado:", await tlsIpv4());
  }
  if (families.includes(6)) console.log("TCP IPv6 porta 443:", await tcp(6));
  console.log("Atenção: TCP/TLS OK não comprova API HTTP saudável; teste diagnose:datajud verifica a consulta com autenticação.");
}
void main();
