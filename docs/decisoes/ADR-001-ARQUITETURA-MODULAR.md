# ADR-001 - Arquitetura modular por domínio

Status: aceito

## Contexto

O Jurisportal Next crescerá em módulos jurídicos e integrações externas. Um monólito sem fronteiras transformaria mudanças de tribunal, IA ou cobrança em risco para o sistema inteiro.

## Decisão

Usar monólito modular no início: uma única aplicação implantável, mas organizada em módulos de domínio com fronteiras claras.

Isso NÃO significa microserviços agora.

## Motivo

Microserviços aumentariam custo e complexidade sem necessidade no estágio atual. Monólito modular permite desenvolvimento rápido e, se algum domínio precisar ser extraído futuramente, a fronteira já existe.

## Consequências

- um deploy inicialmente;
- um banco PostgreSQL inicialmente;
- módulos separados no código;
- integração externa atrás de adaptadores;
- proibição de regras de negócio espalhadas em componentes React.
