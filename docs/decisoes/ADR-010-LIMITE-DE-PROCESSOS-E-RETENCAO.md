# ADR-010 — Limite de processos e retenção

## Status
Aceito.

## Contexto
Clientes cadastrados têm custo marginal baixo e, nos planos pagos, não precisam ser usados como trava comercial. Processos, por outro lado, concentram monitoramento, publicações, documentos, histórico e futuras integrações externas.

## Decisão
- clientes: ilimitados nos planos pagos;
- processos: limitados por plano;
- o limite considera todos os processos criados pelo escritório;
- arquivar/encerrar não libera vaga automaticamente;
- processo não possui exclusão física comum;
- Free continua com limites próprios de experimentação.

## Consequências
Evita abuso por criar, arquivar e recriar processos apenas para contornar a franquia. Também preserva histórico jurídico e deixa o modelo pronto para custos variáveis futuros.

## Evolução futura
Se houver necessidade comercial de liberar vagas, criar política explícita de `slotReleasedAt`/pacotes adicionais, nunca inferir liberação somente pelo status visual.
