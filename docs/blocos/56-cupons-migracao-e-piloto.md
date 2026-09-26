# Jurisportal Next v56 — Cupons de migração e acesso piloto

Data de referência: 25/09/2026. Status: patch incremental a homologar no Windows; **não** é integração Asaas nem ativação de cobrança. O CRON segue desligado.

## Fatos da base anterior
- Plano/Cobrança é interface sem débito; utiliza catálogo de preços atual do projeto.
- Autenticação usa Better Auth + 2FA; isolamento por `organizationId`; não criar contas administrativas via cupom.
- A assinatura do escritório fica em `subscription`; controles `internal` não são faturas pagas.
- A v55 opera o Resend, mas entrega real dos e-mails depende de testes separados.

## Implementação
- `promotion_code`: cupom com 96 bits aleatórios criptográficos, só hash SHA-256 no banco; organização de destino obrigatória; expiração, revogação e vínculo opcional com cobrança confirmada, índices únicos do código, da campanha por escritório e do `redeemedPaymentId`. Um cupom para cada escritório identificado manualmente como migrante do legado; **não** é público/transferível. A emissão exige conta PLATFORM_MASTER ativa, ambiente staging, `--legacy-verified` e `--apply`; não executa envio de e-mail.
- Política `LEGACY_MIGRATION`: 20% **apenas na primeira mensalidade OU primeira anuidade**. Preço anual-base atual (equivalente a 10 meses) é calculado antes dos 20%. Próximas recorrências sem cupom. Sem empilhamento de cupons. Plano Free não aceita desconto. Apenas titular da organização consulta preview; comparação do hash no servidor. Não há consumo na prévia.
- `POST /api/plans/promotion/preview`: autenticado, proprietário, valida código, organização, expiração/revogação, status da assinatura, plano/ciclo e retorna valores em centavos. Erro uniforme para cupom não aplicável; sem cache. Nunca expõe lista de cupons.
- Plano/Cobrança: campo de cupom só na etapa de prévia do pagamento; escolha de plano/modalidade apaga cotação anterior. Botão Finalizar pagamento continua desabilitado. Ausência de Asaas não modifica assinatura, período, processos ou créditos.
- `pilot_access`: concessão com validade e plano delimitado para uma organização *não paga*; não altera o `subscription` real e não dá acesso cross-tenant nem dispensa login/2FA. Acesso retorna ao plano da assinatura ao expirar ou revogar. Comando administrativo para emitir/revogar SOMENTE staging, por PLATFORM_MASTER, com auditoria. Aplicado à resolução de permissões da sessão e captura MANUAL de DJeN. O CRON de produção mantém a filtragem de assinaturas e será revisto durante a implementação agendada.
- Na página Plano e Cobrança aparece aviso do período piloto; não apresentar pagamento confirmado.

## Regras que **não estão** implementadas nesta versão
- Pagamento, criação de assinaturas ou descontos no Asaas, webhooks, reversão, conciliação, reserva atômica de cupom na criação de cobrança e consumo atômico no primeiro pagamento confirmado. Coluna de resgate **não** é preenchida pela prévia. No bloco financeiro, o cupom deve ser reservado por `(organizationId, chargeId)` antes de chamar a API e marcado consumido transacionalmente após webhook verificado, com deduplicação por ID de evento e idempotência; em caso de erro de pagamento, liberar/expirar reserva segundo política.
- Não inferir quem é cliente legado a partir de cupom. Verificação do cadastro legado permanece manual até conectarmos sistema legado a uma migração validada.
- Não enviar promoções automaticamente a clientes reais, nem permitir ao tester importar dados pessoais reais até homologar backup integral, segurança e política de testes.
- A cota mensal de IA exibida na tela continua uma projeção comercial, sem ledger de créditos operacional.

## Plano de teste de um advogado externo
1. Staging com URL HTTPS, escritório exclusivo, login verificado, 2FA e permissões normais; consentimento para programa de teste e dados fictícios/anônimos inicialmente.
2. Conceder PREMIUM por 30 dias, sem cartão e sem fatura, com data de expiração visível. Nenhum acesso a Jurisportal Internal ou organizações alheias.
3. Executar cadastro de cliente, dois processos diferentes e CNJ iguais em outro escritório, documentos fictícios, importação CSV, DJeN com OAB consentida, prazos manuais, dashboard, celular e verificação de e-mail.
4. Repetir consultas para comprovar não duplicidade e conferir falhas em log. Repetir com outro usuário para tentar acesso cruzado de IDs, downloads privados e relatórios.
5. Expirar ou revogar concessão e comprovar retorno ao Free sem exclusão silenciosa; eventuais dados excedentes ficam sujeitos à política de redução, não são apagados neste bloco.

## Instalação / comandos no Windows
Extraia patch na raiz local, confira migration SQL ANTES de aplicar, confira banco staging, execute:
```
npm run db:validate
npm run db:status
npx prisma migrate deploy
npm run db:generate
npm run test:promotions
npm run typecheck
npm run build
```
A migration cria `promotion_code` e `pilot_access`; não altera registros preexistentes. Não usar db push, reset ou reescrever migrations aplicadas.

## Administração opcional, exclusivamente no staging
Depois de verificar o `DATABASE_URL` e criar *organizações fictícias* com os IDs correspondentes:
```
$env:JURISPORTAL_COMMERCIAL_ADMIN = "staging"
npm run promo:issue:migration -- "UUID_ESCRITORIO" "email_master" "2027-01-31" --legacy-verified --apply
npm run pilot:manage -- grant "UUID_ESCRITORIO" "email_master" premium 30 --apply
# revogação:
npm run pilot:manage -- revoke "UUID_ESCRITORIO" "email_master" - - --apply
Remove-Item Env:\JURISPORTAL_COMMERCIAL_ADMIN
```
O comando de cupom imprime o código uma única vez: não publicar em logs compartilhados/Git, copiar e entregar manualmente ao escritório verificado. Os scripts não devem ser executados contra produção comercial nesta etapa.

## Aceite pendente
- Prisma validate/generate, migrations em staging, testes, typecheck, build e interface funcional no Windows do Lucas.
- Testes de API com duas sessões reais e dois escritórios fictícios, prazo de piloto expirado, status pago, cupom de organização errada, cupom expirado/usado/revogado e concorrência do futuro webhook.
- Não declarar que um tester comprovou segurança absoluta; teste reduz risco, não substitui auditoria multi-tenant e RLS/restore.
