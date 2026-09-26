# Bloco 61 — Fundação de créditos de IA e parte contrária manual

## Origem
Incremental sobre v60.1 aplicada. A v60.1 já contém exclusividade dos benefícios do Indique e Ganhe. Não altera indicações, Resend, CRON nem configurações de DNS.

## 1. Processo: contraparte digitada pelo advogado
Em **Processos → Novo processo** e **Processos → [processo] → Editar processo**, campo destacado "Nome da parte contrária". É OPCIONAL; independe do DJeN e DataJud. Ao salvar, mapeia para uma `process_party` com role `Parte contrária` (sem coluna nova). A lista e a ficha priorizam essa indicação revisada quando exibem `20260001 - Cliente X Parte contrária`.

Não muda o polo oficial ou o CNJ, não remove partes importadas e não apaga a contraparte anterior quando o advogado apenas consulta o DataJud. Para retirar a escolha manual, limpe o campo e salve. Não cadastre o cliente representado como contraparte. A prioridade é apenas VISUAL e não altera a atribuição jurídica dos polos.

## 2. Primeira etapa da IA: franquias e livro-razão, SEM chamada de modelo
Cotas por competência `America/Sao_Paulo` e escritório, conforme a especificação de IA de 23/09/2026 e mantendo o Free com publicações SEM IA:

| Free | Essencial | Estratégico | Premium | Executivo | Alta Corte |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 100 | 500 | 2.000 | 5.000 |

As cotas do catálogo e da prévia comercial agora são derivadas da mesma tabela `AI_MONTHLY_UNIT_LIMIT`; Estratégico recebe capabilities apenas de resumo de publicação e extração explícita de datas, ainda sem uso de provedor. Luna/Terra e custo por tarefa continuam PENDENTES de confirmação de disponibilidade/API/custo.

Tabela `ai_credit_usage` mantém por organização/usuário: chave idempotente, competência, ação, reserva/teto, débito confirmado, status, expiração, data e nota de resolução. UNIQUE por organização+chave impede o mesmo pedido de reservar/criar consumo duas vezes. As reservas de todos os usuários de um escritório são serializadas pela trava na linha da organização, dentro de transação. Uma reserva pendente reduz saldo disponível; ao liquidar, consome apenas custo real até o teto; em falha pode ser liberada, em erro posterior estornada com justificativa e registro preservado. Reservas expiram após 5 minutos e deixam de bloquear o saldo; limpeza ocorre na próxima reserva.

**IMPORTANTE:** Não há modelo de IA conectado, botões de resumos, armazenamento de documentos analisados, leitura de PDFs, execução de provedor nem crédito extra comprável neste bloco. O saldo exibido em Plano e cobrança é TÉCNICO (0 gasto até que ações sejam implementadas), não autorização de uso comercial. Ações futuras devem autenticar usuário/organização, selecionar conteúdo autorizado, escolher modelo/custo MAX no servidor, reservar, executar chamada limitada e validar, liquidar ou liberar. Não permitir ao navegador definir valor de créditos, organizationId, plano ou requestKey confiável.

### Revisões obrigatórias antes da IA em produção
- Medir custos reais de ações e leitura, definir teto por tarefa e pacotes adicionais.
- Homologar resumo/extração com contexto autorizado, formato validado, texto original sempre disponível, data literal não igual prazo calculado, LGPD e permissões por escritório.
- Testar concorrência real em staging (duas sessões / duas organizações) e reserva/settle/refund contra Supabase. Estes testes NÃO foram realizados aqui.
- Garantir que operação de provedor finalize em menos de 5 minutos; chamada vencida não deve ser debitada, mesmo se responder tarde. Erros não devem bloquear DJeN/cadastros.

## Aplicação
1. Extrair ZIP por cima da v60.1 e confirmar a conexão de **staging**.
2. `npm run db:validate` e `npm run db:status`.
3. `npx prisma migrate deploy` e `npm run db:generate`.
4. `npm run test:processes`; `npm run test:ai-credits`; `npm run typecheck`; `npm run build`.
5. `npm run dev`; editar processo e salvar nome manual; sair/entrar e conferir a capa e a lista. Conferir o painel técnico de créditos em Plano e cobrança com proprietário da organização.

## Git incremental
`$arquivos = Get-Content 'docs/blocos/61-arquivos-patch.txt'`
`git add -- ($arquivos | ForEach-Object { ':(literal)' + $_ })`
`git add -- src/generated/prisma/` (se versão do gerado é rastreada na base, confirmar `git diff --cached --name-only`)
Verificar `git diff --cached --check` e `git ls-files -- .env.local` (vazio). Não usar `git add -A`: havia resíduos locais de v40/v45 e arquivo acidental `-files -- .env.local`.

## Validação neste ambiente
15 testes isolados dos domínios de oposição, referência, créditos e prévia de plano aprovados usando transpilation local; sintaxe TS/TSX verificada. Não há Prisma/dependências npm locais para validar a migration, compilar todo Next.js ou executar SQL. `npm run db:validate`, `typecheck`, `build` e teste com banco real são portões obrigatórios no Windows.
