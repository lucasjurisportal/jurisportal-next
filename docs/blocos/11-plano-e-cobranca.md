# Plano e Cobrança

## Objetivo
Gerenciar a assinatura do Jurisportal, capacidade contratada, forma de pagamento e histórico de cobranças.

## Escopo
Esta área trata exclusivamente da assinatura do SaaS.
Não se confunde com o Financeiro Jurídico, que pertence aos processos.

## Plano atual
Exibir:
- nome do plano
- status
- ciclo de cobrança
- limites contratados
- consumo de usuários
- consumo de OABs
- consumo de processos monitorados
- recursos disponíveis

## Limites
A interface deve mostrar quantidade utilizada e quantidade total.

Quando o limite for atingido:
- informar de forma discreta
- impedir criação que exceda o plano no backend
- oferecer desativação de recurso/usuário quando aplicável
- oferecer upgrade

A OAB do proprietário também consome o limite. Cada auxiliar exige sua própria OAB cadastrada e consome simultaneamente uma vaga de usuário e uma vaga de OAB.

## Cobrança
Exibir:
- próxima cobrança
- forma de pagamento mascarada
- renovação automática
- status do pagamento

Dados completos de cartão nunca devem passar ou ser armazenados diretamente pelo Jurisportal.
O gateway de pagamento deve cuidar dos dados sensíveis.

## Falhas de pagamento
A lógica final deve seguir a política comercial configurada:
- tentativas de cobrança
- avisos
- eventual suspensão
- reativação após pagamento

Toda mudança precisa ser orientada pelo status confirmado via backend/webhook.

## Alteração de plano
O usuário pode visualizar a capacidade dos planos disponíveis.
Upgrade/downgrade deve:
- verificar consumo atual
- impedir downgrade incompatível
- calcular proporcionalidade quando aplicável
- exigir confirmação
- registrar a alteração

## Histórico
Registrar:
- ativação
- upgrades
- downgrades
- forma de pagamento alterada
- suspensões
- reativações
- usuário responsável
- data/hora

## Segurança
- nunca confiar em status vindo apenas do front-end
- confirmação de pagamento via webhook autenticado
- operações idempotentes
- cartão sempre tokenizado pelo gateway
- logs sem dados sensíveis
