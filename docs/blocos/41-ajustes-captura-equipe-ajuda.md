# v41 | Ajuste consolidado: resultados DJeN, contatos da equipe e Ajuda

**Base:** ZIP local fornecido pelo proprietário + v41 consolidada + correção de normalização da v41, nesta ordem. **Tipo:** patch incremental de correção funcional e acabamento. **Migration:** nenhuma. **Dependências:** nenhuma. **Prisma Generate:** dispensável, pois o schema não foi alterado.

## 1. Incidente: DJeN devolve resultados e a listagem fica vazia

Ao consultar uma OAB, a API informou resultados, porém o Jurisportal exibiu zero comunicações confirmadas e zero itens para revisão. O número de resultados da consulta (`sourceItems`) registra cada retorno bruto, inclusive repetições entre variantes de OAB e a consulta por nome; não corresponde automaticamente ao número de publicações aceitas. A v41 só persiste em `Publication` depois de comparar **número da OAB com complemento, UF e nome completo**. O problema adicional estava em `isPotentialDjenCandidate`: resultados da busca da OAB consultada com destinatário incompleto, número/UF divergente ou estrutura não reconhecida podiam ser descartados ANTES da fila. Assim a UI sequer mostrava o que o CNJ retornou. O código confirma essa possibilidade, mas a causa exata dos sete itens do teste exige consulta real, sem repassar conteúdo privado para diagnóstico.

### Mudanças

- Retornos da consulta OAB/UF que não passaram na conferência estrita entram em `DjenReviewCandidate`, isolados por `organizationId` e `lawyerOabId`. O critério para **vínculo automático** não foi flexibilizado: continua exigindo OAB completa, UF e nome, ou destinatário já confirmado anteriormente para a MESMA comunicação/OAB (inclusive por hash, se não houver ID externo).
- Consulta por nome continua independente; registros com nome claramente diferente não são atribuídos, e resultado sem destinatários vira candidato, nunca prazo ou publicação automática.
- Deduplicação antes de gravar, usando `externalKey` por comunicação, não apenas número CNJ. A fila não é reaberta após descarte ou aprovação, sem novas duplicatas em nova consulta.
- O painel principal mostra **Para revisão** com número do processo, tribunal, data, OAB e trecho de conteúdo para até 20 candidatos; link direto para conferência completa. Somente após confirmar identidade o item passa à lista de publicações. Não criar prazo jurídico automaticamente: só revisão.
- O resultado da consulta explica números brutos, novos confirmados, já conhecidos, itens pendentes (novos e já existentes), retornos fora do escopo e vinculações a processos. Contagens podem divergir do total bruto por duplicação entre consultas.
- `Últimas atualizações do DJeN` exibe por dia registros confirmados e pendências capturados no período. Dias anteriores deixam de aparecer no resumo visual ao passar a janela; **nenhuma publicação ou candidato é apagado do banco**. No sábado e domingo, mantém sexta; na segunda, mantém sexta a segunda. Captura com falha continua sinalizada separadamente.
- Linguagem mais simples: `Para revisão` no lugar de `para revisão humana` e nome do painel conforme decisão do proprietário.

### Regressões de segurança

- Resultados encontrados **não são sinônimo de resultados confirmados**; não prometer que todas as comunicações retornadas pertencem ao escritório.
- Não gerar notificações, vinculação de processo ou prazo a candidato sem identificação. Resultado confirmado vincula por CNJ apenas no mesmo tenant.
- A data de disponibilização não é prazo jurídico e não é inventada. Retificação/cancelamento segue política de origem.
- Logs da normalização continuam sem CNJ, nome, texto ou OAB.

## 2. Equipe: celular e edição limitada de contatos

- `UserProfile.phone` **já existia** no schema Prisma e é reutilizado, sem migration. Celular é opcional e validado no padrão brasileiro com DDD; campo armazenado apenas como dígitos. Cadastrar contato **não equivale a consentimento para WhatsApp/SMS**.
- No cadastro, há aviso visível e confirmação antes de salvar informando que nome, OAB, UF, função e nível não são editáveis nesta área. Apenas e-mail e celular poderão ser editados na Equipe.
- Proprietário pode abrir `Editar contatos` em auxiliares do mesmo escritório. O endpoint PATCH aceita **exclusivamente** `email` e `mobile`, valida no servidor, confere proprietário e organização, preserva os demais campos e audita mudanças sem escrever PII no log técnico.
- Mudança de e-mail torna `emailVerified=false`, revoga sessões, dispositivos confiáveis e desafios antigos do auxiliar. Ele deve entrar novamente e verificar **o novo e-mail** com o fluxo já existente. O envio de códigos por Resend precisa estar configurado; se `RESEND_API_KEY` estiver ausente, o sistema bloqueia a mudança sem modificar dados. Não adicionar credenciais ao patch.
- Celular isoladamente não derruba sessões nem muda o cadastro da OAB.
- Outros membros não recebem o telefone de colegas na listagem; o proprietário pode visualizar.
- E-mail de proprietário não é editado por esta tela. Dados de outras organizações nunca são acessíveis pelo endpoint.

**Teste funcional necessário:** cadastrar auxiliar fictício com celular, atualizar somente telefone, atualizar e-mail para endereço de teste acessível e completar o fluxo real de verificação antes de testar em conta efetiva. Se o provedor de e-mail estiver indisponível, não trocar o e-mail de um usuário real.

## 3. Ajuda

- Busca por assuntos e passos, inclusive sem acento; acesso direto por módulo, seções recolhíveis, guia de início mais claro e visualização mobile.
- Conteúdo de Publicações explica a diferença entre **resultados para revisão** e publicações confirmadas; conteúdo de Equipe esclarece contato e imutabilidade do cadastro.
- A lapidação da comunicação de TODOS os módulos, assim como revisão geral de visual e telas, permanece como fechamento da versão demonstrável, não é declarada concluída aqui.

## 4. Arquivos alterados

- `src/modules/integrations/djen/domain/djen-identity.ts`
- `src/modules/integrations/djen/domain/djen-identity.test.ts`
- `src/modules/publications/application/djen-capture-service.ts`
- `src/modules/publications/application/djen-review-service.ts`
- `src/modules/publications/domain/djen-update-days.ts` e teste
- `src/components/publications/DjenSyncButton.tsx`, `Publications.module.css`
- `src/app/app/publicacoes/page.tsx`, `revisao/page.tsx`
- `src/modules/team/domain/team.schema.ts`, `team-contact-policy.ts` e teste
- `src/modules/team/application/team-service.ts`
- `src/app/api/team/[id]/route.ts`, `src/app/api/team/route.ts`
- `src/app/app/equipe/page.tsx`, `src/components/team/TeamManager.tsx`, `Team.module.css`
- `src/app/app/ajuda/page.tsx`, `src/modules/help/domain/help-content.ts`, `src/components/help/Help.module.css`
- `package.json` (somente acréscimo de testes aos scripts existentes)
- Este arquivo.

## 5. Testes e aplicação

Testes isolados executados em ambiente sem banco/Next: **34 aprovados** (20 núcleo DJeN, 3 vínculo de publicações, 3 janela de atualizações, 5 políticas de equipe e 3 conteúdo de Ajuda). Transpilação sintática dos arquivos alterados: sem erros de sintaxe. **Não foi possível executar `npm ci`, typecheck/build, integração com Prisma, envio de e-mail ou consulta real do CNJ aqui**. Não interpretar testes unitários como homologação completa do fluxo.

Na pasta local atual, depois de sobrepor o patch:

```powershell
npm run test:publications
npm run test:team
npm run test:ui-polish
npm run typecheck
npm run build
```

Sem migrations, `db push`, `migrate deploy` ou novo `npm install`. Reiniciar `npm run dev` e consultar uma vez: conferir **quantos itens ficaram confirmados e quantos estão em Para revisão**, abrir cada processo/texto e aprovar apenas com identidade comprovada. Se a fonte retornar sete registros, não prometer que todos serão sete comunicações diferentes. O teste de alteração de e-mail deve ser feito com usuário fictício e endereço de teste acessível.

Não executar commit antes de os testes e o fluxo crítico de DJeN serem aprovados. Usar staging seletivo por arquivo, conferir `git diff --cached --name-only`, `git diff --cached --check`, `git ls-files -- .env.local` (vazio). Não subir chaves/dumps ou `next-env.d.ts` por reflexo.
