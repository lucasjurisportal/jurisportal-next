// Um escritório por requisição; cada execução conclui até 40 escritórios.
// Não registrar corpo da comunicação nem credenciais em logs do GitHub.
const url = process.env.DJEN_CRON_URL;
const secret = process.env.DJEN_CRON_SECRET;
if (!url || !secret || new URL(url).protocol !== "https:") throw Error("DJEN_CRON_CONFIGURATION_INVALID");
let checked = 0;
for (let index = 0; index < 40; index++) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 290_000);
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${secret}` },
      redirect: "error", signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      console.error("DJEN_CRON_FAILED", { status: response.status, failedOabs: data?.failedOabs ?? null });
      process.exitCode = 1;
      break;
    }
    if (!data.organizationsChecked) break;
    checked++;
    console.log("DJEN_CRON_OFFICE_DONE", { officeCount: checked, newPublications: data.newPublications,
      reviewCandidates: data.reviewCandidates });
  } finally { clearTimeout(timer); }
}
console.log("DJEN_CRON_SUMMARY", { offices: checked });
if (checked === 40) {
  console.error("DJEN_CRON_OFFICE_LIMIT_REACHED");
  process.exitCode = 1;
}
