# Modelos de Petições

## Objetivo
Manter uma biblioteca de documentos jurídicos reutilizáveis, com modelos do Jurisportal e modelos próprios do escritório.

## Biblioteca inicial
Modelos básicos:
- Procuração ad judicia
- Substabelecimento
- Contrato de honorários
- Declaração de hipossuficiência
- Petição de juntada
- Manifestação simples
- Contestação-base

O escritório também pode criar e manter seus próprios modelos.

## Filtros
- categoria
- origem: Jurisportal ou escritório
- busca por nome/finalidade

## Criação de modelo
Campos:
- nome
- categoria
- escopo de uso
- conteúdo do documento

## Variáveis
A estrutura deve suportar variáveis seguras, por exemplo:
- CLIENTE_NOME
- CLIENTE_CPF_CNPJ
- PROCESSO_NUMERO
- PROCESSO_VARA
- ADVOGADO_NOME
- ADVOGADO_OAB

Essas variáveis serão resolvidas pelo backend usando dados autorizados do escritório.

## Geração de documento
Fluxo:
1. escolher modelo
2. selecionar processo e/ou cliente
3. preencher variáveis automaticamente
4. advogado revisar
5. exportar para Word

## Regras
- Modelos do Jurisportal são bases editáveis, não substituem revisão jurídica.
- Não copiar indiscriminadamente conteúdo protegido de terceiros.
- Modelos do escritório permanecem isolados por organização.
- O documento gerado deve registrar qual modelo e qual versão foram usados.
- Dados do cliente/processo não devem ser duplicados dentro do cadastro do modelo.
- Edição futura deve manter histórico de versões dos modelos.


## Formas de criar um modelo
O usuário pode criar um modelo de duas formas:

1. Carregar um arquivo Word `.docx` existente.
2. Escrever ou colar o conteúdo diretamente no editor do Jurisportal.

Na importação de arquivo:
- o arquivo original não deve ser executado;
- o conteúdo será processado em ambiente controlado;
- o sistema deve extrair texto e estrutura suportada;
- macros e conteúdo executável não serão aceitos;
- antes de salvar, o usuário poderá revisar o conteúdo e inserir variáveis do Jurisportal.


## Estado atual
O núcleo funcional foi implementado na v34. Consulte `docs/blocos/27-modelos-peticoes-funcional.md`. Importação/exportação Word permanece como sub-bloco posterior.
