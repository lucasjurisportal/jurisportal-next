# Bloco 54 — Fila de e-mails, prévia e validação de comunicações

**Base de preparação:** ZIP da pasta fornecido nesta conversa + patches v41 a v53. Correções manuais de tipagem relatadas por Lucas não são sobrescritas por este patch. **Estado:** implementação preparada; validação de compilação, staging, Resend e entregabilidade no Windows ainda pendente. Não ligar o CRON.

## Objetivo e mudanças

- A captura do DJeN e a aprovação manual de identidade continuam gravando as comunicações no escritório. A falha no Resend não desfaz a captura nem confirma prazo jurídico.
- A fila de e-mails da v43 é reorganizada por advogado **dentro da mesma organização**. Se uma comunicação atingir duas OABs do mesmo advogado, há uma só comunicação no resumo e ambos os registros ficam auditáveis na fila. Advogados diferentes recebem e-mails distintos. Cada mensagem contém até 30 **comunicações distintas**; um lote maior precisa de mais de um e-mail. Não prometer sempre apenas um e-mail em lotes acima desse limite.
- Uma tentativa com `batchKey`/destinatário já fixados não se mistura com itens novos ao repetir o envio: payload e chave idempotente permanecem estáveis. Alteração do e-mail após tentativa exige conciliação (`UNKNOWN`). A janela de 24 horas de incerteza da v43 é preservada.
- A reivindicação da fila usa transação: se duas execuções concorrerem e não conseguirem reivindicar o lote inteiro, a atualização é revertida. `firstAttemptAt` não é reiniciado nas tentativas seguintes.
- O grupo só aceita OAB ativa, e-mail verificado, membro atual da organização, comunicação ativa e ids de organização coerentes na publicação, entrega e OAB. Resultados ainda em `DjenReviewCandidate` nunca entram nessa fila até confirmação pelo proprietário.
- A página Publicações mostra ao proprietário uma **prévia de leitura**, sem chamar a API do Resend nem expor segredos: e-mails previstos, comunicações distintas, entregas incertas e registros aguardando condições de envio. A prévia lê até 250 registros da fila por consulta, informando quando for parcial.
- A consulta manual exibe separadamente resultado da captura e resultado do e-mail, deixando claro que `SENT` significa aceitação da API do Resend, **não entrega comprovada ou abertura da mensagem**.
- Regra de notificações do sino da v52 preservada, com acesso do proprietário a publicações e revisões do escritório e dos auxiliares apenas às comunicações de suas OABs.

## Arquivos e migração

Ver `54-arquivos-patch.txt`. Nenhuma migration, alteração de schema, instalação de dependência ou mudança no cron. `PUBLICATION_EMAIL_ENABLED` continua `false` por padrão.

## Validação local e homologação

```
npm run test:publication-email
npm run test:publications
npm run test:notifications
npm run test:tenant-scope
npm run typecheck
npm run build
```

Os nove testes isolados dos planners e do HTML existentes foram executados no ambiente de preparação via transpilation isolada e passaram. Não houve `npm run typecheck`/`build` completo, testes com Supabase, CNJ ou Resend deste ambiente. **Não interpretar os testes isolados como homologação de entrega.**

1. Com `PUBLICATION_EMAIL_ENABLED=false`, consultar DJeN e verificar que as comunicações continuam cadastradas, o sino atualiza, o painel exibe envio desativado e nenhuma mensagem é enviada.
2. Somente em staging, com conta de testes autorizada e endereço verificado do proprietário, usar `RESEND_API_KEY`, `RESEND_FROM` com domínio validado e `NEXT_PUBLIC_APP_URL` adequado; configurar `PUBLICATION_EMAIL_ENABLED=true` **no ambiente de teste** e reiniciar o servidor. Nunca enviar chaves ao chat, não comitar `.env.local`. A captura manual de desenvolvimento aciona o dispatch; o agendador continua desligado.
3. Testar pelo menos um advogado com duas OABs e comunicação comum; dois advogados da mesma organização; dono recebe sino; revisão não aprovada não gera e-mail; aprovação permite e-mail ao titular; consulta repetida não reenvia o que está `SENT`.
4. Testar indisponibilidade da API Resend e reexecução; conferir `publication_email_delivery` por organização e no painel do Resend antes de qualquer reenvio de estado `UNKNOWN`. Não editar esses estados diretamente no banco para forçar reenvio.
5. Testar com organizações distintas e e-mails de testes distintos; nenhuma comunicação, nome ou número CNJ de outro escritório deve constar no resumo. Verificar caixa postal real, spam e bounce. `providerEmailId` é evidência de aceite pela API, não de chegada: webhooks de entrega/rejeição e política de conciliação serão parte da homologação de produção.
6. Depois do teste, desligar `PUBLICATION_EMAIL_ENABLED` no staging se não for continuar a homologação. Não ativar `DJEN_CAPTURE_ENABLED` nem agendador.

## Limitações e gates

- Não existe comprovação ponta a ponta da entrega no Resend, política definitiva de webhook, backoff de HTTP 429, alerta externo para `UNKNOWN` ou worker de escala. Os registros `UNKNOWN` requerem conciliação e não são reenviados automaticamente.
- A caixa de notificação da v52 é uma visão resumida; não é substituto das listas persistentes de publicações/processos.
- Com mais de 30 comunicações distintas, serão preparados dois ou mais e-mails para o advogado. A consulta de fila lê até 250 linhas por rodada; uma segunda rodada processa o restante.
- Não atribuir comunicação sem identidade confirmada a uma OAB; prazo final continua depender do advogado.
- Gate pré-lançamento: testar isolamento multi-tenant no Supabase real, entregabilidade com remetente validado, privacidade dos links, recuperação de falhas e execução futura com cron no servidor.
