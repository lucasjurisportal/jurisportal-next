# ADR-020 — Modelos de Petições versionados por escritório

## Decisão
O Jurisportal mantém dois tipos de modelo:

1. modelos-base oficiais do Jurisportal, versionados em código;
2. modelos próprios do escritório, persistidos por `organizationId`.

Modelos próprios não são sobrescritos. Cada salvamento incrementa `currentVersion` e cria um snapshot em `petition_template_version`.

## Variáveis
Variáveis são marcadores explícitos no formato `{{NOME_DA_VARIAVEL}}`. A resolução ocorre no backend, com dados pertencentes ao escritório ativo.

Nenhum dado real de cliente/processo é gravado dentro do modelo-base. O conteúdo preenchido só nasce na geração do rascunho.

## Geração
Cada geração registra:
- modelo e origem;
- versão utilizada;
- processo e cliente, quando houver;
- conteúdo efetivamente gerado;
- usuário;
- data/hora.

Isso permite saber qual base foi usada mesmo depois de o modelo mudar.

## Segurança e responsabilidade
- `organizationId` é obrigatório nos modelos e gerações do escritório;
- seleção de cliente/processo é validada no backend;
- quando processo e cliente são informados juntos, o cliente precisa pertencer ao processo;
- modelos oficiais são bases genéricas e exigem revisão jurídica;
- não há protocolo automático nesta fase;
- importação/exportação `.docx` fica para um sub-bloco posterior, sem alterar esta estrutura.
