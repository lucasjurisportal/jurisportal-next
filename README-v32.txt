JURISPORTAL NEXT v32 — GOOGLE CALENDAR

Esta versão adiciona integração individual e unidirecional com Google Calendar.

ANTES DE RODAR:
1. Preserve seu .env.local.
2. Adicione GOOGLE_CALENDAR_TOKEN_KEY ao .env.local.
3. O Client ID, Client Secret e Redirect URI do Google já devem estar no .env.local.

Gere a chave local com:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

Cole SOMENTE o resultado no .env.local:
GOOGLE_CALENDAR_TOKEN_KEY="..."

Depois:
npm run db:generate
npm run db:validate
npm run db:deploy
npm run typecheck
npm run test:google-calendar
Remove-Item -Recurse -Force .next
npm run dev

Teste em:
http://localhost:3000/app/agenda
