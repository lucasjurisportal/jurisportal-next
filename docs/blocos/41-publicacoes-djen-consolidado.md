# Bloco 41 — Publicações/DJeN consolidado (código incremental)

**Base:** `Projeto Jurisportal Next(3).zip`, posterior à aplicação local da v40, incorporando também o núcleo de validação da v41.1. Este ZIP NÃO contém a aplicação inteira, credenciais, dump, `.git` ou configurações de provedores.

## Contrato verificado da fonte

Swagger público CNJ DJEN 1.0.4, atualizado em 04/03/2026: `https://hcomunicaapi.cnj.jus.br/swagger/djen.yml`, GET `/api/v1/comunicacao`.
- `numeroOab` + `ufOab` e **`nomeAdvogado`** são parâmetros diferentes e oficialmente suportados. Realizamos duas pesquisas externas, independentes; a pesquisa por nome não usa filtro local dos resultados da OAB.
- `dataDisponibilizacaoInicio` e `dataDisponibilizacaoFim` são divididos por dia. `meio=D` restringe ao diário, não à plataforma de editais.
- A documentação indica `itensPorPagina=5` ou `100`. A integração usa 100, pagina a partir de 1 e sinaliza página incompleta, mudança de contagem e limite >=10.000 como erro. `429` não é repetido de imediato; não contornar limite com múltiplos IPs.
- A API pública documenta informações de advogados associados à comunicação, além de identificador, hash, data, tipo, órgão, texto e link. Isso NÃO comprova que todas as regiões/tribunais ou todos os andamentos tenham cobertura integral.

## Identidade e segurança

- Associação automática SOMENTE com número OAB exato (inclui complemento cadastrado), UF e nome integral normalizado; não equipara homônimos nem sufixos desconhecidos. A fonte do nome cadastrado continua `user.name`, ainda não legalmente verificada. Resultado incompleto, ou com OAB/nome divergente, segue fila persistente separada da publicação.
- A fila não confirma prazo, não produz timeline, não envia e-mail ou WhatsApp e não vincula automaticamente ao processo. Proprietário confirma identidade explicitamente ou descarta; ações auditadas e consultas restritas a `organizationId`.
- Comunicações repetidas entre as consultas não viram novos itens: prioriza ID externo, reconcilia chave/hash antigos quando não há conflito e mantém `(organizationId, source, externalKey)`. Comunicações distintas do mesmo CNJ não são colapsadas. Duas identidades legadas conflitantes causam erro, não merge por CNJ.
- CNJ com/sem máscara conserva normalização estrutural de 20 dígitos; não adicionamos DV nesta versão para não quebrar dados legados. Vínculo automático somente ao processo do mesmo escritório. Revisão humana continua obrigatória antes de gerar prazo.
- Texto HTML vira plain text, resumo determinístico de até 320 caracteres, link HTTPS sob `.jus.br` quando informado; URL não validada é omitida, não substituída por link inventado. Datas literais não calculam vencimento.
- Cancelamento sem advogado apenas atualiza comunicação previamente vinculada à MESMA OAB quando o ID estável coincide. Prazo confirmado não é apagado automaticamente.

## Cursor e processamento

- `djen_capture_cursor`: por OAB/escritório, com `completedThrough`, última tentativa/sucesso, erro e lease de 60 min. Avança por DIA apenas após variantes OAB, busca nome, normalização e persistência terminarem. Repetição tem um dia de sobreposição. Primeiro uso busca ontem/hoje; atraso é recuperado em janelas limitadas de 2 dias de progresso por execução. Se houver erro, o último dia bom permanece para repescagem. O lease evita duas capturas normais concorrentes da mesma OAB; falha abrupta poderá segurar uma OAB por até 60 min.
- `/api/cron/djen-capture`: autenticação Bearer `CRON_SECRET` existente, com gate adicional `DJEN_CAPTURE_ENABLED=true`. Um escritório por chamada, priorizado pela última tentativa, com erros e atraso exibidos internamente em `/app/publicacoes`. **NÃO foi criado um agendamento externo nem ativada a rota**: antes disso, validar IP brasileiro/403, taxas de requisição, duração real do provedor e frequência adequada à quantidade de escritórios. O hook isolado não é garantia de execução às 06h/12h/18h.
- OAB/UF não restringe tribunal; não há `TJSP` hardcoded. DJeN não equivale a movimentações gerais, que precisarão do DataJud/conectores processuais em outro bloco.

## Telas e ações

- `/app/publicacoes`: total de pendências de identidade para proprietário, estado da captura por inscrição, conteúdo/resumo e filtros existentes preservados.
- `/app/publicacoes/revisao`: lista de até 100 candidatos por vez; fonte, OAB, nomes, CNJ, data, texto e link quando válido; botão confirmar identidade ou descartar com confirmação explícita.
- `/api/publications/review/[id]`: sessão e segundo fator via app-context, capability do plano, papel `owner`, organização no WHERE, auditoria. Ao aprovar, armazena/publica e gera revisão jurídica pendente; aprovação NÃO confirma prazo.
- `/app/publicacoes/[id]`: resumo, inteiro teor e link de origem validado.

## Banco / implantação

Nova migration ADITIVA: `prisma/migrations/20260923010000_djen_name_review_cursor/migration.sql`.
Adiciona `publication.summary`, `djen_review_candidate` e `djen_capture_cursor`, chaves estrangeiras, índices e `ENABLE ROW LEVEL SECURITY`. **Não modifica** migrations anteriores, backup/R2, Better Auth, calendário, cobranças, planos ou segredos. Como no schema atual, RLS está habilitado mas não há políticas explícitas de tenant nessas novas tabelas; isolamento efetivo da aplicação se baseia em queries com `organizationId` no servidor e acesso Prisma por credencial privilegiada. Auditar RLS e roles antes de produção comercial.

```powershell
cd "C:\Users\Pichau\Desktop\Projeto Jurisportal Next"
npm run db:validate
npm run db:generate
npm run db:status
# Conferir que o banco é STAGING e revisar o SQL antes de aplicar:
npx prisma migrate deploy
npm run test:publications
npm run typecheck
npm run build
npm run db:status
```

**NÃO usar** `prisma migrate reset`, `db push`, `npm audit fix --force`. Conferir que `DIRECT_URL` aponta para o banco correto ANTES de `migrate deploy`; o comando é aditivo, mas não existe rollback automático seguro depois de dados reais nas novas tabelas.

## Testes e estado de homologação

- Testes puros executados neste ambiente por transpilação TypeScript isolada + Node test runner: **20 aprovados, 0 falhas** (normalização, URL, identidade, OAB/UF, homônimos, busca separada, 429, página incompleta, teto de resultados, dedup por ID, CNJ/vínculo). Este executor alternativo NÃO é substituto do script oficial `npm run test:publications` no Windows.
- `npm ci` foi tentado mas o ambiente não resolveu o registry (`EAI_AGAIN`), logo Prisma validate/generate, `typecheck`, `build`, migration no Supabase e teste da API real **NÃO foram concluídos aqui**. Não afirmar que a busca nacional, cron, UI ou RLS foram homologados em produção.
- Antes de liberar clientes reais: testar API real com inscrições autorizadas em amostras de TJ/TRF/TRT e origens com cancelamentos; aprovar/descartar candidatos, validação cross-tenant, plano Free, lease, backfill após outage, 403/429, prazo humano, scheduler/hosting e alerta externo de falha.

## Próximas integrações (não embutidas nesta captura)

Notificações e-mail/WhatsApp com consentimento e quotas, IA por ação/créditos, cobrança Asaas e gate completo de backup/disaster recovery pré-lançamento. Captura DJeN não envia mensagem aos clientes nesta versão.
