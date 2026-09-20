# Validação Google Calendar v32.1

## Objetivo
Validar a integração Google Calendar da v32 sem alterar a arquitetura do Jurisportal Next e corrigir apenas falhas encontradas durante a revisão.

## Correções desta revisão
1. Reatribuição de prazo/tarefa:
   - o vínculo do responsável anterior é reconciliado antes de verificar a conexão do novo responsável;
   - isso evita deixar um evento antigo no Google do usuário anterior quando o novo responsável ainda não conectou Google Calendar.

2. Remoções pendentes:
   - `Sincronizar agora` tenta novamente remover eventos externos que ficaram pendentes para o usuário atual;
   - itens concluídos, removidos da origem ou que deixaram de pertencer ao usuário podem ser limpos após reconexão.

3. OAuth:
   - `state` continua protegendo contra CSRF;
   - a autorização também fica vinculada ao usuário e à organização que iniciaram o fluxo;
   - cookies transitórios são apagados em sucesso, cancelamento e erro.

4. Testes:
   - payload de evento;
   - virada de dia em evento com horário;
   - criptografia AES-256-GCM dos tokens;
   - montagem da URL OAuth com escopo mínimo, callback, offline access e `state`.

5. Dependências:
   - removido `latest` das dependências críticas;
   - `pg` continua em `8.17.2`;
   - nenhuma dependência nova foi adicionada.

## Regras preservadas
- Jurisportal é a fonte de verdade.
- Fluxo v1 permanece unidirecional: Jurisportal -> Google.
- Alterar evento no Google não altera prazo jurídico no Jurisportal.
- `organizationId` continua obrigatório nas consultas da integração.
- A integração continua individual por usuário.
- Falha do Google não desfaz a operação jurídica local.

## Checklist local antes do OAuth real
Executar na raiz do projeto, com `.env.local` preservado:

```powershell
npm run db:generate
npm run db:validate
npm run db:deploy
npm run typecheck
npm run test:google-calendar
Remove-Item -Recurse -Force .next
npm run dev
```

## Checklist funcional com Google
1. Abrir `/app/agenda`.
2. Conectar Google Calendar.
3. Criar uma tarefa com data para o próprio usuário.
4. Confirmar que o evento aparece no calendário principal do Google.
5. Alterar a tarefa e conferir atualização no mesmo evento, sem duplicação.
6. Concluir a tarefa e conferir remoção da projeção no Google.
7. Reabrir a tarefa e conferir recriação/sincronização.
8. Criar audiência e compromisso e conferir sincronização.
9. Testar `Sincronizar agora`.

## Gate para o próximo bloco
Somente após esse checklist externo passar, iniciar `Publicações e Intimações + DJeN`, reaproveitando o núcleo do JurisAlert sem incorporar o MicroSaaS inteiro.
