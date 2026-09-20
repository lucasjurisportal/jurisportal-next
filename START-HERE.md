# COMEÇAR AQUI - Jurisportal Next

## Se você não é programador

A pasta contém duas coisas diferentes:

1. **Prévia visual**: mostra como o produto deverá parecer.
2. **Código Next.js em `src/`**: é onde o sistema real será construído.

Não edite arquivos aleatórios da prévia esperando que isso altere a arquitetura de produção.

## Pasta local

`C:\Users\Pichau\Desktop\Projeto Jurisportal Next`

## Para abrir o projeto

1. Abra essa pasta no VS Code.
2. Abra o terminal do VS Code.
3. Rode `npm install` se ainda não houver `node_modules`.
4. Rode `npm run dev`.
5. Abra `http://localhost:3000`.

## Antes de programar

Leia:

- `docs/PADROES-DO-PROJETO.md`
- `docs/arquitetura/ARQUITETURA-ALVO.md`
- `docs/arquitetura/GUIA-PARA-PROGRAMADORES.md`


## v38 — acabamento funcional antes de Plano e Cobrança

1. Aplique a v38 por cima da pasta local atual para preservar `.env.local` e migrations locais.
2. Configure `JURISPORTAL_SUPPORT_EMAIL` no `.env.local` com o endereço que deve receber o suporte.
3. Não rode migration: a v38 não altera o schema.
4. Rode `npm run typecheck`.
5. Rode `npm run test:ui-polish`, `npm run test:settings`, `npm run test:team` e `npm run test:reports`.
6. Rode `npm run build` e depois `npm run dev`.
7. Valide Ajuda, notificações, Meu perfil, Suporte e Dashboard com dados reais.

## O que foi iniciado na v23

- regras dos planos saíram dos componentes visuais;
- preços promocionais e regulares têm fonte única;
- IA só existe a partir do Premium;
- limites internos de IA foram definidos;
- arquitetura modular e regras para futuros programadores foram documentadas.

## Próxima ação que depende do proprietário

Para transformar Login, Clientes e Processos em dados reais na nuvem, será necessário criar o primeiro banco PostgreSQL gerenciado.

A opção inicial planejada é Supabase.

**Não é necessário fazer isso antes de receber a instrução passo a passo.**

## v27 - próxima execução
1. Preserve seu `.env.local`.
2. Confirme que `RESEND_API_KEY` está no `.env.local`.
3. Rode `npm install`.
4. Rode `npm run db:generate`.
5. Rode `npm run db:validate`.
6. Rode `npm run db:deploy`.
7. Rode `npm run typecheck`.
8. Rode `npm run dev`.
9. Cadastre uma conta usando o mesmo e-mail autorizado no Resend durante o teste com `onboarding@resend.dev`.
10. Confirme o código, saia e teste o login + segundo fator.
11. Depois promova a conta mestre conforme `docs/GUIA-PARA-CRIAR-CONTA-MESTRE.md`.

## v28 - Clientes funcional
1. Preserve seu `.env.local`.
2. Rode `npm run db:generate`.
3. Rode `npm run db:validate`.
4. Rode `npm run db:deploy`.
5. Rode `npm run typecheck`.
6. Opcional: rode `npm run test:clients`.
7. Rode `npm run dev` e abra `http://localhost:3000/app/clientes`.
8. Teste PF, PJ, duplicidade de CPF/CNPJ, edição, arquivamento, filtros e paginação.
9. Para limpar dados de desenvolvimento preservando PLATFORM_MASTER e Jurisportal Internal, use `npm run dev:reset-data`.

## v29 — Processos funcional
1. Preserve o `.env.local`.
2. Rode `npm run db:generate`.
3. Rode `npm run db:validate`.
4. Rode `npm run db:deploy`.
5. Rode `npm run typecheck`.
6. Rode `npm run test:processes`.
7. Rode `npm run dev` e abra `http://localhost:3000/app/processos`.
8. Cadastre primeiro um cliente e depois um processo.
9. Teste edição, busca, vínculo com vários clientes, partes, encerramento, arquivamento e reativação.

## v30 — Processo 360
- linha do tempo operacional;
- prazo/tarefa dentro do processo;
- financeiro jurídico;
- histórico/auditoria.

## v31 — Prazos, Tarefas e Agenda integrados
1. Pare `npm run dev` antes de gerar o Prisma.
2. Preserve `.env.local`.
3. Rode `npm run db:generate`.
4. Rode `npm run db:validate`.
5. Rode `npm run db:deploy`.
6. Rode `npm run typecheck`.
7. Rode `npm run test:work-management`.
8. Limpe o cache Next com `Remove-Item -Recurse -Force .next`.
9. Rode `npm run dev`.
10. Teste um prazo criado dentro do processo e confirme em `/app/prazos` e `/app/agenda`.
11. Crie uma tarefa em `/app/prazos` e confirme que ela aparece no processo.
12. Crie uma audiência em `/app/agenda` vinculada a um processo e confirme a linha do tempo.

## v32 — Google Calendar
1. Preserve `.env.local`.
2. Adicione `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` e `GOOGLE_CALENDAR_TOKEN_KEY`.
3. Gere a chave de cifragem local com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
4. Rode `npm run db:generate`.
5. Rode `npm run db:validate`.
6. Rode `npm run db:deploy`.
7. Rode `npm run typecheck`.
8. Rode `npm run test:google-calendar`.
9. Limpe `.next` e reinicie o servidor.
10. Abra `/app/agenda`, conecte sua Conta Google e use `Sincronizar agora`.

Regra: o Google é uma projeção. Datas jurídicas continuam sendo controladas no Jurisportal.
## v33 — Publicações e Intimações + DJeN
1. Preserve `.env.local`.
2. Não rode `npm install`: esta versão não adiciona dependências.
3. Rode `npm run db:generate`.
4. Rode `npm run db:validate`.
5. Rode `npm run db:deploy`.
6. Rode `npm run typecheck`.
7. Rode `npm run test:publications`.
8. Rode `npm run test:work-management`.
9. Rode `npm run test:google-calendar`.
10. Limpe `.next` e rode `npm run dev`.
11. Abra `/app/publicacoes`. A primeira consulta real ao DJeN é uma etapa de validação externa e deve ser feita conscientemente no ambiente de desenvolvimento.

A captura não envia e-mail ou WhatsApp nesta versão. Uma publicação só vira prazo depois de confirmação humana.



## v34 — Modelos de Petições
A rota `/app/modelos` é funcional, com modelos oficiais e modelos do escritório, histórico de versões, variáveis seguras e geração de rascunhos. Leia `docs/blocos/27-modelos-peticoes-funcional.md`.

## v36 — Relatórios funcional
1. Preserve o `.env.local` e o histórico atual de `prisma/migrations`.
2. Esta versão não cria migration nova.
3. Rode `npx prisma generate` somente se o client Prisma precisar ser regenerado.
4. Rode `npm run typecheck`.
5. Rode `npm run test:reports`.
6. Rode `npm run build`.
7. Rode `npm run dev` e abra `http://localhost:3000/app/relatorios`.
8. Teste filtros de período, CSV de cada relatório e `Imprimir / salvar PDF`.
## v37 — Configurações e importação assistida

A v37 não cria migration. Preserve a pasta atual, inclusive migrations locais já aplicadas.

Como há uma nova dependência para XLSX, rode:

1. `npm install`
2. `npm run typecheck`
3. `npm run test:settings`
4. `npm run test:clients`
5. `npm run test:processes`
6. `npm run test:reports`
7. `npm run build`
8. `npm run dev`

Abra `/app/configuracoes`. Importações ficam disponíveis somente ao proprietário.

