# Bloco 13 - Fundação de domínio

## Objetivo

Criar regras pequenas e reutilizáveis antes de conectá-las ao banco e às telas.

## Implementado

### Número CNJ
Arquivo: `src/modules/processes/domain/cnj-number.ts`

- remove máscara;
- exige 20 dígitos;
- formata no padrão CNJ;
- preserva a possibilidade de guardar valor original.

A validação matemática do dígito verificador ainda não foi ativada. Não inventar essa regra sem teste oficial.

### OAB
Arquivo: `src/modules/lawyers/domain/oab.ts`

- OAB é string, não inteiro;
- preserva valor original;
- cria forma normalizada alfanumérica;
- valida UF brasileira.

### Revisão de prazo
Arquivo: `src/modules/deadlines/domain/deadline-review.ts`

Estados:

- `pending_review`;
- `confirmed`;
- `dismissed`.

No v1, publicação/intimação nunca vira prazo confirmado automaticamente. Mesmo quando existe data sugerida, um usuário precisa confirmar.

## Próximo passo

Persistir essas estruturas em PostgreSQL e ligar o fluxo ao módulo de Publicações/Agenda.
