# Jurisportal Next v36 — Relatórios

Data: 17/09/2026

## Novo bloco funcional

- rota `/app/relatorios` agora funcional;
- relatórios básicos respeitam `reports.basic`;
- relatórios avançados respeitam `reports.advanced`;
- relatório de atividade da equipe exige `team.activity` e usuário proprietário;
- filtros por mês atual, 30 dias, 90 dias, ano e período personalizado;
- visão geral operacional e financeira;
- processos cadastrados no período;
- prazos e tarefas por vencimento;
- publicações e intimações;
- financeiro jurídico;
- atividade auditada da equipe;
- distribuição avançada por status, tipo e responsável;
- exportação CSV auditada;
- impressão / salvar como PDF pelo navegador;
- proteção contra CSV Formula Injection;
- limites de consulta e exportação para evitar cargas sem controle.

## Banco

Relatórios não cria migration nem altera schema.

## Correções preservadas

A v36 incorpora no código-base as correções já validadas durante a estabilização da v35.2:

- resposta do PDF convertida para `Uint8Array` antes de `Response`;
- `Suspense` ao redor do `LoginForm` em `/login` e `/admin/login`.

## Testes do bloco

Novo script:

```powershell
npm run test:reports
```

Executar também:

```powershell
npm run typecheck
npm run build
```

## Observação sobre histórico local de migrations

Durante a validação da v35.2, o Prisma criou localmente no ambiente do desenvolvimento a migration `20260917190411_team_oab_required`. Como ela foi gerada e aplicada no banco local após a distribuição da v35.2, ela deve ser preservada no diretório `prisma/migrations` do ambiente que já a aplicou. A v36 não cria nem altera migrations.
