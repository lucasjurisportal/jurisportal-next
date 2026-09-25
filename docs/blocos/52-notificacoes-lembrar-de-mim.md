# Jurisportal Next v52 | Notificações e Lembrar de mim

**Origem:** ZIP do projeto enviado nesta conversa, patches em sequência até v51, incluindo a correção do importador. Patch incremental, sem `.env.local`, `.git`, segredos, migração, alterações de dependências ou alterações nas regras de inatividade e 2FA. A pasta local do proprietário prevalece em caso de conflito com alterações posteriores.

## Problema corrigido

A versão anterior limitava as publicações do sino a `capturedAt >= hoje - 14 dias` e selecionava apenas 8 registros ao todo, fazendo alertas antigos desaparecem sem tratamento. O evento `notification.read` era tratado apenas como leitura; não equivale a conclusão da publicação ou do prazo.

## Comportamento

- **Novos:** registros criados/capturados há menos de 24h e ainda não lidos.
- **Pendentes:** sem tratamento até completar 14 dias, incluindo registros novos já visualizados. Visualizar não conclui.
- **Atrasados:** sem tratamento há mais de 14 dias, ainda que lidos. É atraso de atendimento no sistema, NÃO constatação de prazo jurídico vencido. O corte é por duração decorrido desde criação/captura; as datas judiciais dos prazos continuam independentes.
- A publicação desaparece das filas quando `treatedAt` é preenchido; candidato para revisão some quando seu status sai de `PENDING`; tarefa/agenda some quando deixa de `OPEN`. Não apagamos registros históricos.
- O proprietário vê comunicações e revisões da própria organização; auxiliares veem comunicações destinadas às suas OABs e tarefas/agenda permitidas. Mantido `organizationId` no backend.
- Leitura individual é registrada no `AuditEvent` por usuário. A API só aceita marcar como lido um ID atualmente visível à sessão/organização; não aceita IDs de outros escritórios.
- Consulta com até 250 registros por origem e 20 cartões por aba no sino, com aviso de lista resumida quando existe truncamento. Este controle limita carga no polling atual (60s); para carteiras grandes, a paginação e contagens exatas por aba permanecem como requisito de escala antes da produção comercial. Todos os registros continuam preservados nas tabelas de origem. Não apresentar o total do sino como contagem global exata se houver truncamento.

## Lembrar de mim

- Opt-in desmarcado por padrão em navegador novo. Ao autenticar com a opção marcada, grava somente o e-mail normalizado em `localStorage` daquele perfil de navegador; nunca armazena a senha.
- O campo senha segue `autocomplete="current-password"`; preenchimento de senha é responsabilidade do gerenciador de senhas do navegador/aparelho, sujeito às configurações e eventual sincronização dele. Não prometer armazenamento estritamente no dispositivo físico.
- Desmarcar remove imediatamente o e-mail local; erro de autenticação não salva novo e-mail. Não aplicar lembrança local no login administrativo.
- `rememberMe` do Better Auth segue o opt-in para usuários comuns. Segundo fator, dispositivo confiável e timeout por inatividade continuam independentes. Não foi feita alteração em bancos ou cookies de sessão.

## Arquivos

Ver `docs/blocos/52-arquivos-patch.txt`.

## Validação realizada neste ambiente

- 5 testes isolados da classificação de notificações: aprovados usando transpilação TS -> JS local, sem rede ou banco.
- Parse/transpilação sintática TypeScript dos arquivos TS/TSX alterados: sem erro de sintaxe.
- `npm ci` expirou neste ambiente; logo NÃO foi possível executar `npm run typecheck`, `npm run build`, testes completos de backend ou browser end-to-end. Necessária validação na máquina de Lucas.

## Comandos PowerShell (após extração manual)

```powershell
npm run test:notifications
npm run test:publications
npm run typecheck
npm run build
```

Teste de navegador: login novo -> desmarcado -> marcar -> entrar -> sair -> tela preenche e-mail, gerenciador do navegador pode preencher senha; desmarcar -> e-mail não reaparece em novo acesso; 2FA/inatividade continuam funcionando. No sino: abertura marca leitura sem tirar de Pendentes; item >14 dias aparece em Atrasados; marcar comunicação como tratada remove do sino, sem removê-la do processo; não expor dados entre dois escritórios.

## Git

```powershell
git status --short
$arquivos = Get-Content 'docs/blocos/52-arquivos-patch.txt'
git add -- ($arquivos | ForEach-Object { ":(literal)$_" })
git diff --cached --name-only
git diff --cached --check
git ls-files -- .env.local
# Depois dos testes:
git commit -m "v52 Notificacoes organizadas e lembrar de mim"
git push origin main
git status
```

`next-env.d.ts`, `APLICAR-v40.txt` e outras sobras não integram este patch. Se existirem mudanças locais no mesmo arquivo do patch, comparar antes de substituir.

## Próximo bloqueio de lançamento

Testes de integração multi-tenant de API/Prisma/R2 e homologação de e-mails por OAB em staging. Paginação robusta do sino para carteiras grandes, políticas LGPD e a recuperação full stack são gates pré-lançamento. CRON continua desativado e não foi introduzida integração de IA ou pagamentos.
