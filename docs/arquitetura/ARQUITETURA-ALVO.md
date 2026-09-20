# Arquitetura-alvo do Jurisportal Next

## Objetivo

Construir um SaaS jurídico que possa crescer sem virar um arquivo gigante, sem espalhar regra de negócio dentro de tela e sem depender de um único fornecedor externo.

## Explicação simples

Pense no sistema como um prédio.

- `src/app/` é a recepção: recebe a pessoa e mostra as telas.
- `src/modules/` são os departamentos: Processos, Clientes, Prazos, Publicações, Planos, IA etc.
- `src/shared/` será a caixa de ferramentas que realmente é usada por vários departamentos.
- Banco de dados é o arquivo central do prédio.
- Integrações externas são prestadores de serviço. Elas podem ser trocadas sem demolir o prédio.

## Estrutura pretendida

```text
src/
  app/                       rotas e composição das páginas
  modules/
    plans/
      domain/                regras puras de plano
      application/           casos de uso
    ai/
      domain/
      application/
    organizations/
    users/
    clients/
    processes/
    publications/
    deadlines/
    agenda/
    documents/
    finance/
    reports/
    notifications/
    billing/
  integrations/
    djen/
    datajud/
    email/
    whatsapp/
    openai/
    storage/
    payments/
  shared/
    auth/
    database/
    validation/
    errors/
    ui/
```

## Regra principal de dependência

Uma tela não deve conhecer detalhes de fornecedor externo.

Errado:

```text
Tela de Processo -> fetch direto no DataJud
```

Correto:

```text
Tela de Processo
-> caso de uso de Processo
-> porta de consulta processual
-> adaptador DataJud/Jusbrasil/outro
```

Assim, se a fonte mudar, o módulo Processo continua existindo.

## Multi-tenant

Todo dado pertencente ao escritório deverá carregar `organizationId`.

Exemplos:

- cliente
- processo
- prazo
- documento
- publicação tratada
- usuário membro
- lançamento financeiro

Nenhuma consulta de negócio pode buscar dados de organização sem filtrar pelo escritório autorizado.

## Regras que não podem ficar apenas na interface

- permissão de usuário;
- limite do plano;
- franquia de IA;
- acesso a documento;
- exclusão lógica;
- criação de prazo;
- cobrança;
- troca de plano.

Esconder um botão no navegador não é segurança. O servidor deverá validar novamente.

## Integrações externas

Cada integração deve possuir um adaptador próprio. Exemplo para publicações:

```text
Publications module
-> PublicationSource interface
   -> DjenPublicationSource
```

Para consulta de processo:

```text
Processes module
-> ProcessDataProvider interface
   -> DataJudProvider
   -> JusbrasilProvider (futuro)
```

## Banco e arquivos

- PostgreSQL: dados estruturados.
- Object storage: PDF, DOCX, comprovantes e anexos.
- Arquivo grande não deve virar coluna binária no banco sem uma razão muito forte.

## Código

- TypeScript estrito.
- Funções pequenas e nomeadas pelo que fazem.
- Regra de negócio fora do React.
- Nenhum componente de centenas de linhas misturando banco, API, validação e HTML.
- Schemas de entrada centralizados.
- Erros previsíveis tipados ou normalizados.
- Operações externas idempotentes quando puderem ser repetidas.

## Testes mínimos por módulo

1. regras puras;
2. permissão/capability;
3. fluxo principal;
4. falha esperada;
5. isolamento por `organizationId` quando houver banco.

## Documentação obrigatória

Cada módulo real terá arquivo próprio com:

- objetivo;
- pastas/arquivos;
- entidades;
- casos de uso;
- regras;
- permissões;
- integrações;
- variáveis de ambiente;
- testes;
- como alterar sem quebrar;
- limitações conhecidas.
