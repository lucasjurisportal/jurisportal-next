# Jurisportal Next v53 | Escopo de escritório e auditoria de isolamento

**Base:** v52 reconstruída com os arquivos da conversa; a pasta local de Lucas continua sendo a referência definitiva. **Tipo:** patch incremental, sem migration, novas dependências, alteração de CRON ou mudanças na cobrança.

## O que foi corrigido no backend

- Operações de alteração/arquivamento/exclusão de clientes passam a exigir **id + organizationId no WHERE da escrita**, além da verificação prévia.
- Alteração do status de processo, atualização/conclusão de tarefa e vínculo de publicação a processo recebem a mesma proteção na escrita.
- Alteração da revisão de prazo mantém organizationId no UPDATE, inclusive quando a publicação já passou pela verificação do escritório.
- A leitura do workspace financeiro/operacional exige a existência do processo no escritório antes de devolver membros e outros metadados.
- A busca de notificações de auxiliar exige que a OAB destinatária pertença explicitamente à mesma organização.
- `scopedRecordWhere` evita construir uma mutação com ID ou organização vazios.

A inclusão de `organizationId` na escrita fecha a janela entre verificar o registro e atualizá-lo por ID isolado. **Não torna o sistema comprovadamente imune a todas as formas de vazamento.** Cada rota e cada relacionamento precisam de revisão contínua. A autorização de papel/capability continua responsabilidade das APIs.

## Testes incluídos

`npm run test:tenant-scope`: casos isolados de IDs repetidos em escritórios diferentes, escopos distintos e rejeição de filtros incompletos.

`npm run audit:tenant-isolation -- "ID_ORG_A" "ID_ORG_B"`: script **somente leitura**, que exige a variável de confirmação `JURISPORTAL_SECURITY_TEST=staging` e dois escritórios fictícios distintos já cadastrados no banco apontado por `.env.local`. Exige pelo menos um processo em cada escritório; recursos ausentes nos dois ambientes são marcados como **pendentes**, não como aprovados.

O script verifica consultas de leitura com IDs cruzados para processos, clientes, publicações, documentos, movimentos, prazos/tarefas, finanças, OABs e modelos. Também executa chamadas aos serviços reais `getProcess`, `getProcessWorkspaceData`, `getClient`, `getPublicationDetail` e `listProcessDocuments` com um ID do outro escritório. Inspeciona vínculos relacionais entre tenants e relata quantidade de tabelas com RLS habilitado/sem políticas e possível bypass da conexão utilizada. Não altera registros, não imprime credenciais, nomes, números CNJ nem IDs dos testes.

**Este teste não simula sessões reais HTTP nem reproduz toda a infraestrutura do Supabase.** Uma conexão Prisma privilegiada pode contornar RLS; o resultado do script não certifica políticas de banco como segunda barreira.

## Execução no PowerShell, após a extração habitual do ZIP

```powershell
npm run test:tenant-scope
npm run test:processes
npm run test:publications
npm run test:notifications
npm run typecheck
npm run build
```

Teste complementar com **dois escritórios fictícios somente em staging**; confira previamente que `.env.local` aponta ao banco correto. Os IDs abaixo são placeholders, **não envie credenciais ao chat**:

```powershell
$env:JURISPORTAL_SECURITY_TEST = "staging"
npm run audit:tenant-isolation -- "ID_ORG_A" "ID_ORG_B"
Remove-Item Env:\JURISPORTAL_SECURITY_TEST
```

Se o script acusar vínculos cruzados, interrompa a homologação e preserve os dados para investigação. Não faça limpeza automática. Se faltar fixture, crie processos fictícios através da interface antes do teste; não cadastre dados reais para essa auditoria.

## Teste HTTP indispensável (ainda pendente)

1. Abra duas sessões separadas, de dois escritórios fictícios A e B; inclua um processo com o mesmo CNJ em ambos, mas clientes e documentos diferentes.
2. Na sessão A, tente acessar a URL `/app/processos/<id_do_B>` e os endpoints GET `/api/processes/<id_do_B>`, `/api/clients/<id_do_B>`, `/api/processes/<id_do_B>/documents`, `/api/processes/<id_do_B>/external-movements`. A resposta deve negar a operação, sem devolver nomes ou metadados de B; repita B→A.
3. Teste autorização do auxiliar e do proprietário para relatórios, equipe, downloads, modelos, notificações e exportações. Apenas em staging, com registros fictícios, faça também requisições de mutação cruzadas e confirme que nenhum dado do outro escritório foi alterado.
4. Verifique que URLs presignadas do R2 expiram e nunca são geradas para documento de outro escritório. Uma URL já emitida é uma credencial temporária e pode ser utilizada até expirar; não a compartilhe em logs, mensagens ou analytics.
5. Confirme o uso efetivo das políticas RLS e o papel/owner utilizado pela conexão Prisma. Não aplique `FORCE ROW LEVEL SECURITY` indiscriminadamente: pode bloquear Better Auth, jobs e o app se não houver contexto de organização transacional homologado.

## Pendências antes do lançamento

- Validar ponta a ponta as rotas com duas sessões HTTP e fixtures representativas.
- Auditar tabelas novas, estruturas de conexão, roles, grants e políticas reais no Supabase e definir uma segunda barreira comprovada sem quebrar Better Auth.
- Revisar autorização e limites de papel de cada módulo, inclusive dados processuais alimentados por DJeN/DataJud e futura IA.
- Adicionar CI de typecheck, build e suites completas em todo pull request; dependências usam faixas `latest` em parte da configuração, o que ainda merece estabilização.
- Não habilitar cobrança comercial enquanto isolamento, backup integral e resposta a incidente não forem homologados.

## O que foi validado no ambiente de preparação

A sintaxe dos arquivos TS/TSX alterados passou por transpilação isolada e **4 testes isolados de escopo foram aprovados**. Não foram executados `npm run typecheck`, `npm run build`, chamadas HTTP autenticadas ou teste contra o Supabase do Lucas neste ambiente. Nada foi afirmado como homologado em produção.
