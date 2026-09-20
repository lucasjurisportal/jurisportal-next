# ADR-018 - CNJ imutável e referência interna do processo

## Status

Aceita.

## Contexto

Permitir alteração livre do número CNJ depois que um processo já possui publicações, prazos, documentos e histórico cria risco de misturar dois processos diferentes no mesmo workspace.

Ao mesmo tempo, o CNJ não é uma referência confortável para o uso diário do escritório.

## Decisão

1. O CNJ é confirmado no cadastro e fica bloqueado para usuários normais.
2. O backend valida essa regra independentemente da interface.
3. Correção excepcional por `PLATFORM_MASTER` no ambiente interno exige justificativa e auditoria.
4. Cada processo recebe referência interna anual por organização: `AAAA + sequência`, por exemplo `20260001`.
5. O texto amigável `20260001 - Parte x Oposto` é derivado em tela, não persistido como identidade.
6. Referência interna e CNJ são ambos pesquisáveis.
7. Migrações futuras devem validar os CNJs em staging antes da criação definitiva dos processos.

## Consequências

- maior proteção contra sobreposição acidental de processos;
- referências mais fáceis para atendimento e operação;
- necessidade de fluxo administrativo específico para correções excepcionais;
- importadores futuros precisam respeitar a mesma identidade e auditoria.
