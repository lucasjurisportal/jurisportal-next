# Padrões do Jurisportal Next

Este documento separa duas fases do projeto.

## 1. Prévia visual atual

O arquivo `sistema_Jurisportal.html` é um protótipo navegável e propositalmente autocontido.
Ele serve para validar UX, estrutura, textos, hierarquia e fluxo antes de conectarmos banco de dados e integrações.
Não deve ser tratado como a arquitetura final de produção.

## 2. Código de produção

Quando cada bloco migrar para o Next.js real, aplicar:

- TypeScript em modo estrito.
- Componentes por domínio, evitando arquivo monolítico.
- Regras de negócio fora dos componentes visuais.
- Validação compartilhada com schemas.
- Autorização no servidor, nunca somente escondendo botão no front-end.
- `organizationId` em todo dado multi-tenant.
- Sem segredos, certificados ou chaves privadas expostos ao navegador.
- Operações sensíveis com idempotência e proteção contra duplicidade.
- Exclusão lógica quando histórico e auditoria precisarem ser preservados.
- Acessibilidade: labels, foco de teclado, contraste e estados de erro.
- Responsividade validada em desktop, tablet e celular.
- Estados de loading, sucesso, vazio e erro em operações assíncronas.
- Testes unitários para regras e testes de fluxo para caminhos críticos.
- Documentação do bloco atualizada depois da implementação real, não antes dela.
- Commits pequenos e vinculados a uma alteração compreensível.

## Regra de documentação

Cada módulo terá um arquivo em `docs/blocos/` contendo:
objetivo, escopo, telas, regras, dados, permissões, integrações, estados de UI,
decisões tomadas, pendências e testes esperados.

## Arquitetura modular obrigatória

A partir da fundação funcional, consultar também:

- `docs/arquitetura/ARQUITETURA-ALVO.md`
- `docs/arquitetura/GUIA-PARA-PROGRAMADORES.md`
- `docs/produto/PLANOS-E-CAPABILITIES-v1.md`
- `docs/produto/IA-v1.md`

Preço, capabilities e limites de IA não devem ser duplicados em componentes visuais.
