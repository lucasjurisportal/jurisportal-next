# Auditoria do estado atual - início da fase funcional

Data de referência: 15/09/2026.

## O que existe de verdade no código Next.js

- App Router em `src/app/`.
- Site público em componentes separados.
- Login e Cadastro visuais.
- Consulta de CEP no Cadastro via ViaCEP no navegador.
- Dashboard visual com dados simulados.
- CSS global e CSS Modules.
- TypeScript com `strict: true`.
- Documentação extensa das telas/protótipos.
- Prévia offline que continua útil como referência visual.

## O que ainda é simulação

- Login não cria sessão real.
- Cadastro não cria usuário, escritório nem assinatura.
- Dashboard usa arrays fixos em código.
- Processos/clientes/prazos/publicações das prévias não estão em banco.
- Plano não é aplicado pelo servidor.
- DJeN ainda não está integrado a este repositório.
- IA ainda não está integrada.
- Cobrança ainda não está integrada.

## Pontos positivos encontrados

- Projeto pequeno o suficiente para organizar sem reescrita traumática.
- TypeScript estrito já habilitado.
- Componentes públicos já estão separados.
- Identidade visual e fluxo de produto já foram validados antes do backend.
- Nenhum `.env` ou segredo real foi encontrado no ZIP analisado.

## Pontos que precisam ser corrigidos na fase funcional

### 1. Fonte de verdade comercial
Antes da v23 os preços e limites ficavam em `src/data/plans.ts` e eram usados diretamente pela UI.

Correção iniciada: regras comerciais foram movidas para `src/modules/plans/`.

### 2. Dependências sem versão fixa
O `package.json` usa `latest`. Isso é ruim para produção porque uma instalação futura pode baixar versões diferentes das testadas.

A correção deve ser feita quando executarmos a próxima instalação real: gerar `package-lock.json` e fixar as versões que efetivamente passaram no build.

### 3. Componentes ainda grandes
`SignupForm.tsx` concentra interface, validação simples, consulta de CEP e submissão visual.

Não é crítico enquanto é protótipo, mas na fase real deverá ser dividido em componentes/casos de uso e schemas de validação.

### 4. Dados de demonstração dentro da interface
O Dashboard contém métricas e atividades fixas.

Quando houver banco, o componente deverá receber uma ViewModel construída por caso de uso, sem conhecer SQL ou fornecedor externo.

### 5. Prévia offline é propositalmente monolítica
Arquivos HTML autocontidos não serão usados como arquitetura de produção. Eles permanecem apenas como referência visual.

## Decisão de sequência

Não criaremos quinze módulos conectados a dados falsos.

A ordem funcional é:

1. planos/capabilities;
2. banco e autenticação;
3. organização/escritório;
4. clientes;
5. processos;
6. prazos/tarefas/agenda;
7. DJeN;
8. notificações/e-mail;
9. IA Premium;
10. financeiro/documentos/modelos/relatórios;
11. cobrança;
12. integrações avançadas.

## Critério para considerar um módulo "funcional"

Um módulo só sai de protótipo quando:

- persiste dados reais;
- aplica organização/permissão no servidor;
- valida entradas;
- trata loading/erro/vazio/sucesso;
- tem pelo menos testes das regras críticas;
- tem documentação atualizada.
