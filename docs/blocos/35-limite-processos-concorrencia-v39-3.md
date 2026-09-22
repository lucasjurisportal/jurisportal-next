# Jurisportal Next v39.3 — Limite de processos sob concorrência

## O que muda

O cadastro manual e a importação CSV/XLSX já utilizam `createProcess`. A versão anterior contava os processos **fora** da transação que efetivamente os criava: dois usuários poderiam ler a mesma contagem e ocupar a última vaga simultaneamente.

Nesta atualização, `createProcess`:

1. Valida previamente o formulário e as entidades vinculadas.
2. Inicia uma transação do PostgreSQL com isolamento `ReadCommitted`.
3. Bloqueia temporariamente o registro da própria organização com `SELECT ... FOR NO KEY UPDATE`. Outros escritórios não esperam nessa mesma trava. Essa trava vale inclusive entre instâncias diferentes do Next.js/Vercel, e só dura até a transação terminar.
4. **Após obter a trava**, reconta todos os processos do escritório, inclusive encerrados/arquivados, e compara com o limite recebido do plano do servidor.
5. Verifica CNJ duplicado, emite referência interna, grava processo, vínculos, histórico e auditoria na mesma transação.
6. Confirma o registro ao concluir; em erro, desfaz a transação e libera a trava.

`FOR NO KEY UPDATE` preserva a compatibilidade com operações usuais de chave estrangeira (KEY SHARE) e retorna uma coluna `id` UUID suportada pelo Prisma, evitando a falha conhecida de `pg_advisory_xact_lock(...)` retornando `void`.

## Arquivo substituído

`src/modules/processes/application/process-service.ts`

Documentação nova: `docs/blocos/35-limite-processos-concorrencia-v39-3.md`.

**Não altera Prisma schema, migrations, configurações, .env.local, Git, frontend, R2 ou Documentos.** O patch é sobre a v39 disponibilizada anteriormente e não desfaz as correções locais da v39.1/v39.2, que são em outros arquivos.

## Como aplicar

1. Confirme que não há trabalhos locais não salvos neste arquivo. Faça um commit de segurança no Git se desejar.
2. Extraia o ZIP de atualização na raiz de `C:\Users\Pichau\Desktop\Projeto Jurisportal Next`, permitindo substituir somente o arquivo indicado.
3. Execute no PowerShell:

```powershell
npm run typecheck
npm run build
npm run db:status
```

`db:status` deverá permanecer atualizado. **Não há nova migration.** Não rode `db push`, `migrate reset` ou `migrate dev` por esta mudança.

## Teste funcional de aceite em desenvolvimento

Use **somente uma organização de testes e CNJs de teste válidos**, sem processos reais:

1. Escolha um escritório de plano Free com 9 dos 10 processos cadastrados (ou outro plano com apenas uma vaga livre).
2. Abra duas sessões do mesmo escritório, idealmente uma sessão normal e outra em navegador anônimo com outro usuário autorizado.
3. Prepare dois CNJs diferentes, válidos e ainda não cadastrados, um em cada sessão.
4. Salve ambos tão perto do mesmo instante quanto possível.
5. Resultado esperado: **um** cadastro confirmado, **outro** recusado com “O limite de processos do seu plano foi atingido”. Contagem final: 10, nunca 11.
6. Confira que o processo recusado não gerou referência interna, vínculos, linha de auditoria de criação nem histórico parcial.
7. Repita com dois usuários do mesmo escritório tentando cadastrar o *mesmo* CNJ, com duas vagas livres: um cadastra; o outro recebe mensagem de CNJ já cadastrado.
8. Repita concorrência entre cadastro manual e importação de arquivo: a mesma última vaga não poderá ser consumida duas vezes. A importação pode relatar uma linha não importada, sem ultrapassar a quota.
9. Arquivar um processo não deve liberar vaga.

Na API de cadastro manual, a recusa esperada retorna HTTP 409 com `PROCESS_LIMIT_REACHED` ou `PROCESS_DUPLICATE_CNJ`. O formulário atual já traduz esses códigos.

## Limites conhecidos / próximos blocos

- O limite é informado pelo **plano resolvido no backend** antes de chamar o serviço. Quando a cobrança e os upgrades/downgrades forem integrados, devemos incluir teste de troca de plano simultânea à criação de processo e revalidar o estado comercial nesse fluxo.
- Outras formas futuras de criar processos (sincronização externa/API) **devem chamar `createProcess`**. Inserts diretos em `prisma.process.create` por novos módulos contornariam o serviço e precisam ser proibidos em revisão de código.
- Este pacote não altera as reservas de armazenamento dos PDFs, que pertencem ao serviço Documentos.

## Verificações realizadas na preparação

- Confirmado que o cadastro manual chama `createProcess`.
- Confirmado que o commit de importação CSV/XLSX também chama `createProcess`.
- Confirmada a existência de índice `UNIQUE(organizationId, cnjNormalized)` para duplicidade CNJ e de sequência anual protegida pelo banco.
- Sintaxe TypeScript transpilada sem erros na ferramenta de verificação disponível. **Sem dependências instaladas neste ambiente, não foi possível executar aqui o typecheck/build completo nem um teste real no seu Supabase.** Faça os comandos acima na sua máquina antes de considerar validado.
