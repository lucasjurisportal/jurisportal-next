import { createHmac, createHash } from "node:crypto";

/**
 * S3 Signature V4 sem dependência adicional: R2 usa o endpoint S3 por conta.
 * A URL presignada é criada EXCLUSIVAMENTE no servidor. Nenhuma credencial chega ao navegador.
 * A assinatura para PUT vincula Content-Type=application/pdf e a chave aleatória.
 */
function config(target: "main" | "backup" = "main") {
  const backup = target === "backup";
  const accountId = (backup ? (process.env.R2_BACKUP_ACCOUNT_ID || process.env.R2_ACCOUNT_ID) : process.env.R2_ACCOUNT_ID)?.trim();
  const accessKey = (backup ? process.env.R2_BACKUP_ACCESS_KEY_ID : process.env.R2_ACCESS_KEY_ID)?.trim();
  const secret = (backup ? process.env.R2_BACKUP_SECRET_ACCESS_KEY : process.env.R2_SECRET_ACCESS_KEY)?.trim();
  const bucket = (backup ? process.env.R2_BACKUP_BUCKET : process.env.R2_BUCKET)?.trim();
  const endpoint = (backup ? process.env.R2_BACKUP_ENDPOINT : process.env.R2_ENDPOINT)?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  if (!accountId || !accessKey || !secret || !bucket || !endpoint) throw new Error(backup ? "R2_BACKUP_NOT_CONFIGURED" : "R2_NOT_CONFIGURED");
  if (backup && bucket === process.env.R2_BUCKET?.trim()) throw new Error("R2_BACKUP_MUST_USE_SEPARATE_BUCKET");
  const base = new URL(endpoint);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") {
    throw new Error("R2_ENDPOINT_INVALID");
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("R2_BUCKET_INVALID");
  return { base, accessKey, secret, bucket };
}

const hash = (data: string) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest();
const encode = (text: string) => encodeURIComponent(text).replace(/[!'()*]/g, (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`);

export function presignR2(method: "PUT" | "GET" | "HEAD" | "DELETE", key: string, ttlSeconds = 120, target: "main" | "backup" = "main") {
  const { base, accessKey, secret, bucket } = config(target);
  if (!key || key.split("/").some((segment) => !segment || segment === "." || segment === "..")) throw new Error("R2_KEY_INVALID");
  const date = new Date();
  const stamp = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = stamp.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const path = `/${encode(bucket)}/${key.split("/").map(encode).join("/")}`;
  const values: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKey}/${scope}`],
    ["X-Amz-Date", stamp],
    ["X-Amz-Expires", String(Math.max(1, Math.min(600, ttlSeconds)))],
    ["X-Amz-SignedHeaders", method === "PUT" ? "content-type;host;if-none-match" : "host"],
  ];
  const query = values.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
  const canonicalHeaders = method === "PUT"
    ? `content-type:application/pdf\nhost:${base.host}\nif-none-match:*\n`
    : `host:${base.host}\n`;
  const signedHeaders = method === "PUT" ? "content-type;host;if-none-match" : "host";
  const canonicalRequest = `${method}\n${path}\n${query}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;
  const signable = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${hash(canonicalRequest)}`;
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secret}`, day), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(signable).digest("hex");
  return `${base.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

export async function inspectR2Pdf(key: string) {
  const head = await fetch(presignR2("HEAD", key, 30), { method: "HEAD", cache: "no-store" });
  if (head.status === 404) throw new Error("R2_OBJECT_NOT_FOUND");
  if (head.status === 401 || head.status === 403) throw new Error("R2_AUTH_FAILED");
  if (!head.ok) throw new Error("R2_INSPECTION_FAILED");
  const length = Number(head.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length <= 0) throw new Error("DOCUMENT_SIZE_INVALID");
  // Checagem mínima de assinatura binária; MIME do navegador, por si só, não é validação.
  const range = await fetch(presignR2("GET", key, 30), { headers: { Range: "bytes=0-7" }, cache: "no-store" });
  if (!range.ok || range.status !== 206) throw new Error("PDF_SIGNATURE_UNVERIFIED");
  const header = new Uint8Array(await range.arrayBuffer());
  const prefix = Buffer.from(header).toString("ascii");
  if (!prefix.startsWith("%PDF-")) throw new Error("PDF_INVALID");
  return { sizeBytes: length };
}

export async function deleteR2Object(key: string) {
  const result = await fetch(presignR2("DELETE", key, 30), { method: "DELETE", cache: "no-store" });
  if (!result.ok && result.status !== 404) throw new Error("R2_DELETE_FAILED");
}

/** Configuração do backup é independente da credencial de uso diário. */
export function isR2BackupConfigured() {
  return Boolean(process.env.R2_BACKUP_BUCKET?.trim() &&
    process.env.R2_BACKUP_ACCESS_KEY_ID?.trim() &&
    process.env.R2_BACKUP_SECRET_ACCESS_KEY?.trim());
}

/** O namespace evita colisões entre staging/produção e entre buckets de origem. */
export function getR2BackupKey(sourceKey: string) {
  const prefix = process.env.R2_BACKUP_PREFIX?.trim();
  const sourceBucket = process.env.R2_BUCKET?.trim();
  if (!prefix || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(prefix) || !sourceBucket) {
    throw new Error("R2_BACKUP_PREFIX_NOT_CONFIGURED");
  }
  if (!sourceKey.startsWith("organizations/") || sourceKey.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("R2_BACKUP_INVALID_SOURCE_KEY");
  }
  return `${prefix}/${sourceBucket}/${sourceKey}`;
}
