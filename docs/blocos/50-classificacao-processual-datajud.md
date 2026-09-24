# v50 | Tipo, ação e assuntos do processo

## Objetivo
Separar o **tipo/área definido pelo escritório**, a **classe processual oficial** recebida da fonte e os **assuntos** retornados pelo DataJud. A consulta que voltou a funcionar na v49 não deve atribuir erroneamente a Execução de Título Extrajudicial ao campo de área nem tratar Contratos Bancários como o procedimento da ação.

## Modelo de dados
- `Process.caseType` (`String?`): rótulo livre preenchido pelo advogado, por exemplo `Cível`, `Trabalhista`, `Penal`. Sem enum, lista fechada ou inferência apenas pelo tribunal/CNJ.
- `Process.processClass` (`String?`): procedimento/classe oficial, por exemplo `Execução de Título Extrajudicial`. Mantém a informação já salva nas versões anteriores e a origem `classe.nome`.
- `Process.subject` (`String?`): assunto principal quando identificado como tal na fonte ou quando há um único assunto.
- `Process.otherSubjects` (`String[]`): demais assuntos encontrados; se a fonte retornar **vários assuntos sem indicar o principal**, conserva todos neste campo e deixa o assunto principal em branco para o advogado escolher.

Nenhum processo existente é reclassificado, excluído ou vinculado a outra organização. Os campos antigos `processClass` e `subject` conservam seus valores. O servidor valida e salva `caseType` e `otherSubjects` tanto na criação quanto na edição. Os campos são visíveis na ficha e pesquisáveis no catálogo (busca por assunto adicional exige termo integral).

## UI e fluxo
Cadastro, edição, pré-preenchimento a partir de publicação, consulta DataJud e visão geral exibem Tipo/área, Ação/procedimento, Assunto principal e Outros assuntos. Tipo é livre; DataJud não sugere o tipo. Consulta externa preenche apenas campos vazios e incorpora assuntos adicionais sem descartar conteúdo já digitado. Na ausência de assunto principal explícito, a UI não inventa um.

## Migration
`20260924100000_v50_process_classification/migration.sql` acrescenta `caseType TEXT NULL` e `otherSubjects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]` na tabela `process`.

Antes de `prisma migrate deploy`, confirmar `DIRECT_URL` do ambiente de staging e `npm run db:status`. Não usar `db push`/`migrate reset`. Após a migration executar `npm run db:generate`, `npm run test:process-lookup`, `npm run test:processes`, `npm run test:publications`, `npm run typecheck`, `npm run build`. O ZIP contém apenas arquivos-fonte e SQL, não Prisma Client gerado ou segredos. A v46 precisa estar aplicada no banco antes da v50, se ainda estiver pendente.

## Testes incorporados
- `process-metadata.test.ts`: vários assuntos, deduplicação e ausência de assunto principal quando ambíguo; `classe.nome` permanece classe e não se infere área pelo TJSP.
- Teste manual: consultar CNJ de exemplo, preencher tipo livre, salvar, reabrir edição, conferir os campos e procurar o processo pelos rótulos; assegurar que não houve alteração nos processos existentes.

## Não faz parte desta atualização
CRON, integração de pagamento, alteração nos planos, IA, inclusão automática de classe/área que a fonte não oferece, exclusão de registros ou alterações de rede/DataJud. A melhoria de classificação não substitui homologação de isolamento multi-tenant e disponibilidade externa.
