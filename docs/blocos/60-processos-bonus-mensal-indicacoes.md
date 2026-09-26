# v60 — Referência com as duas partes e Indique e se Remunere

Base: pasta do projeto reconstruída com patches até v59. PATCH incremental, extrair sobre o projeto local v59 depois de conferir alterações próprias. Nova migration **20260925233000_v60_referral_commission_ledger**. Não há alterações de valores/assinaturas nem envio financeiro real. Não ativar CRON.

## 1. Referência amigável de processo

Formato da lista de Processos e do cabeçalho da ficha: `20260001 - Lucineia Rosa X Banco Exemplo`.

- Primeiro nome: cliente principal **representado** pelo escritório, com prioridade para `ProcessClient.isPrimary`, nunca o usuário que digitou o cadastro.
- Segundo nome: parte **não representada** vinda de `ProcessParty`; não usar cegamente a primeira linha, que pode duplicar o representado quando importada da publicação.
- Se `partyRole` está preenchido para o cliente e a contraparte possui papel reconhecível oposto (autor/réu, requerente/requerido etc.), selecionar o lado oposto. Se houver múltiplos nomes sem polo inequívoco, exibir `Parte contrária não cadastrada` até o escritório revisar. Isso é um rótulo de ausência/ambiguidade, NÃO uma inferência judicial.
- A lista agora consulta as partes cadastradas, não apenas `take: 1`. Os dados armazenados, números CNJ e identificadores não são alterados; nenhuma migração de Processos.
- Importante: DataJud/DJeN não assegura a identificação inequívoca do representante em todos os casos. Este patch utiliza o vínculo jurídico cadastrado e as partes já salvas; não inventa nomes. Se faltar nome, cadastrar/revisar em Editar processo.

## 2. Duas faixas de benefício, mutuamente exclusivas

**Indique e Ganhe (v60.1, faixa 3–4):** três primeiras mensalidades de escritórios convidados **qualificadas**; benefício de uma mensalidade **exclusivamente para o escritório indicador Premium mensal ativo**, sujeito à integração de cobrança. Não conceder mensalidade Alta Corte/Executivo/anuidade.

**Bônus mensal dentro do Indique e Ganhe (v60.1, faixa 5+):** após cinco escritórios indicados *qualificados*, participar da apuração de **R$ 30 fixos** por mensalidade efetivamente recebida e elegível de cada escritório indicado, sem teto de indicados. Não é 20% do preço do plano, não é bônus por clique/convite e não incide sobre anuidade. Cinco mensalidades elegíveis em uma competência: R$ 150; dez: R$ 300. Após adquirir a quinta indicação, pagamentos elegíveis da competência podem entrar na apuração conforme regulamento definitivo. O código de convite permanece pessoal e reutilizável.

**Interpretação implementada para confirmação de Lucas:** cinco **escritórios indicados atualmente qualificados** desbloqueiam o programa; cada mensalidade elegível dos indicados gera R$ 30. A conta da competência zera no primeiro dia do mês de São Paulo, mas não apaga a relação de convites, o histórico, dinheiro já pago ou valores ainda sujeitos a maturação. Se quiser exigir ao menos cinco *faturas pagas todos os meses* para liberar QUALQUER repasse daquele mês, precisamos alterar o requisito antes de Asaas.

## 3. Livro-razão criado sem créditos fictícios

A migration acrescenta `referral_commission_entry`, com uma competência por organização indicada, um `externalPaymentId` único, beneficiário `referrerUserId`, valor em centavos de R$30, status, timestamp de elegibilidade, transferência e reversão. `@db.Date` representa a competência por data, não timestamp em UTC. RLS ativado. Não criar políticas de acesso para navegador; consultas server-side escopadas pelo indicador autenticado. Uma linha exige fatura real **mensal** comprovada pela futura integração de pagamentos. Endpoints públicos não podem alterar livro-razão, marcar QUALIFIED ou PAID, nem disparar PIX.

A API `POST /api/referrals/me` fornece código fixo, progresso de 3, progresso/desbloqueio de 5 e resumo mensal da contabilidade própria. Não apresenta nomes de indicados nem dados bancários. A interface mostra **projeção**, não saldo disponível nem repasse confirmado. O programa de remuneração é separado do Premium; a restrição Premium aplica-se ao mês gratuito, não foi estendida automaticamente a comissões em dinheiro.

## 4. Cutoff mensal, carência e segurança financeira

1. Uma mensalidade do indicado tem ID da fatura/recebimento único e competência em `America/Sao_Paulo`.
2. Somente pagamento recebido/autenticado pode gerar lançamento `PENDING_REVIEW`. A primeira indicação só vira qualificada após a primeira fatura paga, permanência mínima de **28 dias** e rechecagem de assinatura mensal ativa, sem cancelamento, estorno ou chargeback.
3. Para cada repasse, verificar se a cobrança da competência já cumpriu a carência e a conciliação e se **não** é a mesma competência ainda em curso. Idealmente `eligibleAt = max(recebimento + 28 dias, primeiro dia da competência seguinte em São Paulo)` após confirmação do provedor; eventual espera maior posterga o repasse, não o perde.
4. Na virada de mês a projeção de mensalidades **do novo mês** volta a zero. As competências anteriores maduras podem formar o saldo pendente, e as ainda em análise continuam no livro-razão para possível apuração no mês posterior.
5. Transferir uma única vez por lançamento via referência externa única, após formalizar dados de recebimento/termos; registrar reconciliação idempotente e reversões. Não pagar enquanto há status `PENDING_REVIEW` nem quando assinatura mensal está cancelada.

**Neste patch NÃO há integração Asaas, rotina que grave lançamentos, envio a Lucas ou pagamento automático.** A migração cria a estrutura, o domínio faz a projeção defensiva e a interface mostra zero até existir prova financeira real. Não executar SQL manual para marcar créditos como pagos. A elegibilidade ao mês grátis termina quando o indicador alcança 5 indicações qualificadas; um benefício já efetivamente concedido não é estornado. A nova elegibilidade à remuneração não equivale a repasse automático. A comissão de R$30 por mensalidade de plano de entrada precisa ser confrontada com margem, taxas e tributos antes de liberar repasses.

## 5. Testes e implantação local

Verificar banco de desenvolvimento/staging; rodar `npm run db:validate`, `npm run db:status` e `npx prisma migrate deploy` apenas na conexão correta, `npm run db:generate`, `npm run test:processes`, `npm run test:promotions`, `npm run typecheck`, `npm run build`. Sem alteração do Resend, R2 ou CRON. Após reiniciar `npm run dev`, conferir nomes reais na listagem e no detalhe; para nomes ausentes usar Editar processo; verificar se o código de convite permanece o mesmo e a única régua apresenta marcos 3/5; após 5, a elegibilidade ao mês Premium some e só a projeção de bônus mensal permanece.

Testes locais isolados do domínio (TypeScript transpilado): 16 aprovados. **Não executei build, typecheck completo, Prisma Validate/Generate nem migration no Supabase** neste ambiente; sua validação no Windows permanece necessária.

## Pendências posteriores

- Integração autenticada com Asaas para registrar fatura recebida, renovação mensal, eventos de cancelamento/estorno/chargeback, carência e contabilidade idempotente. Homologar faturas de outubro/novembro em ambiente controlado antes de repasses.
- Formalização de regulamento de indicação, recebedor (inclusive auxiliar), retenções/documentação fiscal, dados bancários/PIX e conciliação da transferência. Nenhum repasse se autoriza apenas pelo front-end ou pelo e-mail.
- Fluxo de alerta de quinta indicação para `lucasjurisportal@gmail.com` na ocasião em que for QUALIFIED, sem duplicações, **ainda não ligado**.
- Em múltiplas partes do mesmo polo ou nomes importados sem papel inequívoco, permitir revisão pelo escritório; nunca inferir adversário do texto livre sem validação humana.
