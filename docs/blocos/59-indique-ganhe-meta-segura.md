# v59 — Indique e Ganhe: interface e qualificação de benefício

**Base:** projeto fornecido no chat + patches até v58. Patch incremental sobre a pasta local de Lucas; confirmar diff antes de substituir alterações locais. **Sem migration e sem integração Asaas nesta versão.**

## Decisões de produto

- Código pessoal `JPI-...` fixo e reutilizável; convidado recebe **10% somente na primeira mensalidade**. Não aplicável à primeira anuidade (o cupom `JPM` de migração permanece separado, com regras próprias).
- Meta promocional passa de **2 para 3 indicações qualificadas**. Um mês de benefício é **exclusivo da assinatura Premium mensal ativa do escritório indicador**, nunca o valor variável de Executivo/Alta Corte ou de plano anual. No futuro, o benefício deverá ser creditado no **escritório Premium elegível**, mesmo quando a indicação pertença a um auxiliar; definir regulamento e vínculo do crédito na integração financeira.
- Cada indicado tem de ter a primeira mensalidade confirmada **por origem financeira autenticada**, permanecer ativo por ao menos **28 dias completos** desde o pagamento e não ter cancelamento, estorno ou chargeback. A observação da primeira fatura **não prova por si só** permanência de 28 dias. A elegibilidade ainda será revalidada imediatamente antes de conceder qualquer benefício.
- O status técnico `QUALIFIED` em `referral_attribution.status` fica reservado ao futuro conciliador financeiro, após comprovar pagamento e maturação. **Nenhuma rota pública grava `QUALIFIED`; o botão Registrar convite não contabiliza pagamento.** `firstPaidAt` isolado não completa a meta. Revisar estados e registro de eventos antes de ligar Asaas.
- O marco de 5 indicações e possível comissão de 20% da v57 ficam **sem pagamento, sem elegibilidade automática e sem promessa na interface resumida**. Requerem política comercial/contábil própria (base bruta/líquida, duração, impostos, cancelamento e transferência). Não alterar benefício em dinheiro com um patch visual.
- O ciclo anual não conta na indicação mensal, nem se torna elegível ao benefício Premium mensal. `REFERRAL_FREE_MONTH_THRESHOLD = 3`, `REFERRAL_HOLD_DAYS = 28`.

## Implementação

- `src/modules/promotions/domain/referrals.ts`: política pura e testável de maturação, condições de cancelamento e limite Premium mensal; progressão nunca concede pagamento ou meses gratuitos.
- `src/app/api/referrals/me/route.ts`: contagem server-side de convites próprios, separando aguardando pagamento / em verificação / qualificados; consulta de assinatura do escritório ativo; resposta sem dados identificáveis de escritórios indicados e com `Cache-Control: no-store`.
- `src/components/promotions/ReferralCodeCard.tsx` + CSS module: cartão conciso, código, três segmentos da meta, contadores e diálogo nativo acessível de Como funciona? (ESC/fechamento). Não publica detalhes pessoais de indicados.
- `src/modules/promotions/domain/referrals.test.ts`: regras de 28 dias, mensalidade, cancelamento, plano Premium, aumento de meta para 3 e proibição de autoindicação. **Não existe API de aplicação de recompensa nesta versão.**

## Segurança financeira e ressalvas

O Asaas distingue `PAYMENT_CONFIRMED` de `PAYMENT_RECEIVED`, e publica eventos de estorno/chargeback. O conciliador futuro deve validar autenticação do webhook, `paymentId`, assinatura, organização, valor, periodicidade, estorno e renovação; garantir idempotência e proteção contra pagamento/criação repetidos. A verificação no 28º dia exige assinatura ativa e ausência de cancelamento, mas uma contestação posterior pode obrigar reverter o benefício antes de creditá-lo. Uma mensagem no sino ou clique não constitui prova de pagamento.

A regra de 28 dias é uma **carência comercial proposta**, não prova universal de que não haverá chargeback. A concessão de um mês grátis não está implementada até haver integração financeira e cálculo de período de competência e vencimento. Não modificar inscrições, processos, planos, valores ou pagamentos nesta versão. O CRON segue desligado.

## Testes Windows

```powershell
npm run test:promotions
npm run typecheck
npm run build
```

Na interface: Configurações → Conta e acesso → Indique e ganhe; conferir código estável, meta de 3 segmentos, botão Como funciona?, modal por ESC e layout mobile. Escritório com plano anual ou Alta Corte não recebe recompensa Premium por pontuação. Sem Asaas, é esperado **0 qualificados** e progresso não deve subir apenas pelo registro de convite. Para testar a qualificação, executar testes de domínio, **não adulterar `firstPaidAt` no Supabase**.

## Pendências

- Definir regulamento final, beneficiário quando indicação é de auxiliar, acumulação de três em três vs prêmio único e manutenção de elegibilidade após mudança de plano.
- Conectar Asaas com webhook autenticado, registros de pagamento/estorno/cancelamento, conciliação no dia 28 e crédito exclusivo no ciclo Premium mensal.
- Programa financeiro de cinco indicações e alerta administrativo, somente após aprovação econômica, fiscal e política de estornos.
- LGPD e termos do programa antes do beta pago. A cobrança real permanece desativada.
