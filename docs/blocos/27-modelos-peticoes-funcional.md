# Bloco 27 — Modelos de Petições funcional

## Objetivo
Transformar `/app/modelos` de item de menu sem rota em uma biblioteca jurídica funcional e auditável.

## Implementado
- biblioteca de modelos-base do Jurisportal;
- modelos próprios por escritório;
- criação e edição;
- arquivamento/restauração;
- histórico de versões imutável;
- variáveis seguras;
- preenchimento com dados de processo/cliente/advogado/escritório;
- registro de cada rascunho gerado;
- capability `petitionTemplates.basic` já existente continua sendo a fonte comercial;
- Free continua sem o recurso;
- nenhuma dependência npm nova.

## Modelos-base iniciais
- Procuração ad judicia;
- Substabelecimento;
- Contrato de honorários;
- Declaração de hipossuficiência;
- Petição de juntada;
- Manifestação simples;
- Contestação base.

## Variáveis iniciais
- `{{CLIENTE_NOME}}`
- `{{CLIENTE_CPF_CNPJ}}`
- `{{PROCESSO_NUMERO}}`
- `{{PROCESSO_REFERENCIA}}`
- `{{PROCESSO_VARA}}`
- `{{PROCESSO_COMARCA}}`
- `{{PROCESSO_CLASSE}}`
- `{{PROCESSO_ASSUNTO}}`
- `{{PARTE_CONTRARIA}}`
- `{{ADVOGADO_NOME}}`
- `{{ADVOGADO_OAB}}`
- `{{ESCRITORIO_NOME}}`
- `{{ESCRITORIO_CIDADE}}`
- `{{DATA_ATUAL}}`

## Geração
Nesta versão, o resultado é um rascunho textual auditável e copiável. A geração não substitui revisão jurídica.

Importação de `.docx`, preservação avançada de formatação e exportação Word devem ser implementadas em sub-bloco próprio. Isso evita adicionar biblioteca de processamento de Office antes de validar o núcleo da biblioteca.

## Banco
Novas tabelas:
- `petition_template`
- `petition_template_version`
- `petition_generation`

RLS é habilitado como segunda barreira, enquanto todas as consultas normais continuam filtradas por `organizationId`.

## Auditoria
Eventos internos continuam em inglês por estabilidade técnica. A interface traduz rótulos para pt-BR.

Eventos novos:
- `petition_template.created`
- `petition_template.updated`
- `petition_template.archived`
- `petition_template.restored`
- `petition_template.draft_generated`

## Teste
`npm run test:petition-templates`
