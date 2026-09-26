# Jurisportal Next v57 — Indique e ganhe, cupons e definição de Fundadores

**Data:** 25/09/2026. **Base:** v56 com v55 corrigida. **Status:** patch incremental para testes locais e staging. Pagamentos e recompensas NÃO estão habilitados. CRON e Asaas continuam desligados.

## O que já existia na v56
- Cupom `JPM-...` de migração do legado: **não automático**. PLATFORM_MASTER em staging emite manualmente pelo comando `npm run promo:issue:migration -- ID_ORG EMAIL_MASTER AAAA-MM-DD --legacy-verified --apply` após conferir o cliente do legado. Valor único, destino único e expiração. O código é mostrado uma única vez na saída administrativa. O preview NÃO resgata cupom; o consumo depende de cobrança verificada pelo gateway futuro. Migração: 20% primeira **mensalidade ou anuidade**.
- Piloto: um escritório fictício ou com dados autorizados pode receber um plano temporário gratuitamente por script administrativo em staging. Sem cobrança e sem dispensa do login/2FA. **Piloto completo de IA precisará ocorrer novamente quando os recursos de IA estiverem implementados.**

## Implementação v57
1. `referral_profile`: código `JPI-...` público, aleatório, com 96 bits, **fixo e pessoal por usuário**. Gerado de forma idempotente quando a pessoa visita Configurações → Conta e acesso; a mesma pessoa mantém o código entre escritórios/dispositivos. Não pode ser usado para autenticação. `User` é a identidade do indicador, não `Organization`.
2. `referral_attribution`: registra somente um indicador para cada escritório novo, de forma única no banco. Proprietário do escritório convidado pode confirmar seu vínculo clicando **Registrar convite** na prévia de pagamento. Benefício indicado: **10% somente na primeira mensalidade**, não anualidade; conta de origem diferente, sem autoindicação nem indicação da própria equipe; não aplicável a assinatura já paga. Código pessoal pode ser distribuído a diferentes novos escritórios. Não é resgatado/consumido a cada compartilhamento.
3. Cupom `JPM` e convite `JPI` são identificados no mesmo campo, sem empilhamento. Prévia de convite **não** significa venda confirmada. Registro de convite também não concede desconto definitivo sem pagamento.
4. `referralProgress` registra metas de **2 primeiros pagamentos confirmados = elegível a 1 mês grátis** e **5 primeiros pagamentos confirmados = elegível ao programa financeiro, referência de 20% das mensalidades efetivamente pagas pelos indicados**. A v57 só calcula metas sobre `firstPaidAt` verificado, não em cadastros nem em cliques; não cria meses gratuitos nem transfere dinheiro.
5. Na página de Configurações → Conta e acesso, qualquer usuário de escritório (proprietário ou auxiliar) vê/copia seu código e as contagens pendentes/confirmadas. Cada usuário vê somente seus próprios indicadores; proprietários que inserem o código são os únicos que registram a indicação do escritório convidado.

## O que depende de decisão e do Asaas
- Vínculo cupom/desconto na primeira cobrança e **reserva + consumo transacional no webhook verificado**, tratamento de pagamentos `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`, estornos, chargeback e duplicidade de evento. Jamais aceitar chamada do navegador para marcar pagamento confirmado. Webhook deve validar origem/credencial do Asaas e reconciliar ID da cobrança, valor e organização, com índice único do `firstPaymentId`.
- Mês grátis por **duas indicações pagas**: decidir a qual escritório creditar caso o indicador seja auxiliar, como lidar com anualidade e como estender assinatura já paga sem duplicar benefícios. Não apagar dados ao expirar benefício.
- Comissão **em dinheiro** a partir de cinco: definir prazo (recorrente ou campanha limitada), se 20% incide sobre bruto/líquido, se é sobre mensalidades posteriores ou retroativas, estornos, teto, CPF/CNPJ/dados bancários do recebedor, tributos, conciliação, saída do funcionário e regras antifraude. Pagamento ao indicador, não ao escritório, depende de aceite do regulamento. Não expor dados bancários aos escritórios indicados.
- Ao chegar à quinta indicação **realmente paga**, alertar `lucasjurisportal@gmail.com` por e-mail institucional com controle de envio idempotente e auditoria. O campo de endereço administrativo ficará em variável de ambiente, não na interface do usuário. Essa mensagem não é disparada por cadastro, prévia ou clique em Registrar convite.
- Incluir regulamento do programa, privacidade, elegibilidade, proibição de indicações artificiais, tratamento de dados, atualização e revogação de benefícios, e revisão jurídica/contábil pré-lançamento.

## Fundadores, apenas levantamento, SEM implementação comercial
- Possibilidade futura: `founder_membership` por organização, com coorte de até **100 vagas**; contador e reserva atômicos para impedir vaga 101 em concorrência; visibilidade opcional na grade de planos; limite independente de usuários/OABs da assinatura e do acesso piloto.
- Usuário ainda definirá preço, duração, benefícios, momento em que vaga é ocupada, cancelamento/transferência e como um fundador muda de plano. **Não** criar 100 usuários gratuitos, alterar cap table, estoque, preços ou permissão de acesso nesta versão.

## Segurança e limitações
- Sem compartilhar informações dos indicados com o usuário indicador: contagem apenas; sem nome/e-mail do escritório convidado. Restrição de propriedade de cada rota pelo contexto do usuário/organização. Código tem entropia alta e NÃO é senha.
- A migração v57 adiciona duas tabelas novas (`referral_profile`, `referral_attribution`) sem alterar registros existentes. RLS habilitado, políticas reais no Supabase precisam auditoria; Prisma privilegiado não equivale a política RLS homologada.
- API de convite não concede plano, desconto financeiro ou comissão; index único por escritório indicado. A ligação entre convite e Asaas deve ser validada antes do beta pago.

## Implantação Windows/staging (sem extrair via terminal)
```
npm run db:validate
npm run db:status
# confira que DIRECT_URL é do banco staging e revise a migration da v57
npx prisma migrate deploy
npm run db:generate
npm run test:promotions
npm run typecheck
npm run build
```
Teste visual: login em dois usuários distintos -> Configurações/Conta; códigos diferentes e estáveis após recarregar. Segundo escritório novo -> Plano e cobrança -> Alterar plano -> Mensal -> inserir código JPI -> Aplicar -> Registrar convite. Recarregue a página do indicador e confira 1 pendente, 0 confirmados. Cupom JPM de outra org deve continuar bloqueado. Primeiro pagamento não foi simulado.

## Aceite
- 7 testes isolados do domínio v56/v57 executados neste ambiente, aprovados. `typecheck`, `build`, migration, consultas reais ao Supabase e fluxo UI ainda precisam validação no Windows com suas dependências; não foram executados aqui.
- Integração Asaas, piloto de IA completo, programa de comissão e Fundadores não podem ser declarados prontos.
