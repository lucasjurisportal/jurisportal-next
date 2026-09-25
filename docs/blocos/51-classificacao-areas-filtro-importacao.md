# Jurisportal Next v51 | Área do Direito, filtros e importação

**Base de trabalho:** ZIP inicial recebido neste chat, com patches sucessivos até a v50. Inclui a correção de compatibilidade `otherSubjects` do importador. O ZIP é incremental: extrair na raiz local já atualizada, sem substituir a pasta inteira. Não contém `.env.local`, chaves, `.git` ou dados de clientes.

## Decisão de produto

Área do Direito, classe da ação e assuntos são três informações diferentes:
- **Área do Direito** (`Process.caseType`): classificação operacional escolhida pelo escritório, com sugestões selecionáveis (Cível, Trabalhista, Penal etc.) e opção **Outra área** digitável. Não é enum Prisma, não é catálogo fechado e não é deduzida pelo tribunal, CNJ ou nome da ação.
- **Ação / procedimento** (`Process.processClass`): classe oficial recebida do DataJud quando disponível, ou preenchida pelo advogado.
- **Assunto principal** e **outros assuntos** (`subject` e `otherSubjects`): preservam a origem e a multiplicidade; não passam automaticamente a ser classe ou área.

## Escopo implementado

1. Formulário de novo processo e edição: `select` de área com sugestões e opção aberta, preservando valores legados fora da lista. A escolha Outra área exige texto. Continua sendo permitido deixar a área em branco.
2. Listagem de processos: filtro exato, sem diferenciação de caixa, por área; lista inclui áreas livres já cadastradas no próprio escritório, quantidade por área e opção para localizar processos sem área. Os filtros de responsável, status e pesquisa combinam-se, e a paginação conserva a área selecionada.
3. API GET `/api/processes`: aceita o filtro `caseType` com as mesmas regras; não modifica permissão nem organização. Serviço lista e agrega somente os processos de `organizationId` do contexto autenticado.
4. Assistente de importação CSV/XLSX: distingue `Área do Direito`, `Ação / procedimento`, `Assunto principal`, `Outros assuntos` e `Fórum` quando presentes na planilha. Outros assuntos aceitam ponto e vírgula ou quebras de linha; não dividir por vírgula dentro de uma descrição. Planilhas antigas sem as colunas continuam válidas. Correção de `otherSubjects: []` ausente na base ZIP da v50 incluída em ambos os fluxos, prévia e importação.
5. Os rótulos da ficha e do cadastro foram alinhados para **Área do Direito**. O CSS original `Processes.module.css` **não foi substituído** para preservar eventuais ajustes locais da v50. Uma folha de estilo isolada organiza o novo filtro responsivo.

## Arquitetura, segurança e migração

- Nenhuma migration ou alteração do schema; v50 já criou `caseType` como string opcional e `otherSubjects` como lista.
- Nenhuma mudança no conector DataJud, nas comunicações DJeN, no banco de outros escritórios, no CRON ou em pagamentos.
- Nenhuma reclassificação automática de processos existentes: `Civil`, por exemplo, continua exibido como valor customizado. Dados de uma organização nunca entram nas opções de filtro de outra.
- Filtros e agregações são feitos no servidor; não foi criada uma lista global pública de categorias usadas por clientes.

## Validações realizadas neste ambiente

- Parser TypeScript verificou a sintaxe dos arquivos TS/TSX alterados, sem diagnóstico.
- 6 testes isolados aprovados para opções de área, filtro, agrupamento, mapeamento de planilhas e parser de outros assuntos, executados sobre JS transpilado dos arquivos `.ts` desta versão.
- **Não executados aqui:** `npm run typecheck`, `npm run build`, testes de integração PostgreSQL, prévia no navegador nem restauração em banco de Lucas. Rodar no Windows antes do commit.

## Comandos PowerShell após extração manual

```powershell
npm run test:processes
npm run test:settings
npm run typecheck
npm run build
```

Teste funcional: novo processo com Cível; editar para outra área escrita pelo escritório; confirmar que ação e assuntos permanecem inalterados; filtrar por área, status e responsável, paginar; filtrar Sem área definida; importar planilha antiga e uma com Área do Direito e Outros assuntos. Sem necessidade de Prisma Generate, migration ou `npm install`.

## Git

```powershell
git status --short
$arquivos = Get-Content 'docs/blocos/51-arquivos-patch.txt'
git add -- ($arquivos | ForEach-Object { ":(literal)$_" })
git diff --cached --name-only
git diff --cached --check
git ls-files -- .env.local
# Após testes e conferência da lista:
git commit -m "v51 Areas do Direito filtros e importacao de processos"
git push origin main
git status
```

Se `Processes.module.css` ou outros arquivos estiverem modificados, não incluí-los silenciosamente; conferir e registrar separadamente conforme sua origem. `next-env.d.ts` e arquivos auxiliares anteriores não fazem parte desta versão.

## Próxima frente de trabalho

Homologação de envio agrupado de e-mail aos advogados, notificações do proprietário e testes reais de isolamento multi-tenant. A especificação de IA permanece um bloco posterior, com ações delimitadas e créditos, sem acoplar captura DJeN à IA.
