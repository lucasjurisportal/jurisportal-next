# Jurisportal Next v39.5 — Modelos/Petições: editor jurídico em folha A4

**Natureza:** refinamento do bloco Documentos + Petições. **Ainda não é a v40 de encerramento**: faltam backups e restauração real; documentação consolidada do bloco inteiro será elaborada quando chegar à v40.

## Problema anterior

O gerador possuía preenchimento por cliente/processo, salvamento, exportação PDF e anexação ao R2, mas a revisão do documento era realizada em textarea sem formatação visual. A seleção de cliente/processo era uma lista extensa; não havia prévia interna do PDF final, e as ações eram pouco evidentes.

## Implementado neste incremento

- `PetitionPaperEditor`: folha de edição A4 (794px x 1123px, margens equivalentes a ~20mm, fonte próxima à PDF), edição direta, negrito, itálico, sublinhado, título e alinhamentos esquerda/centro/direita/justificado. Área pode crescer: a paginação **real** é sempre verificada pelo botão Visualizar PDF.
- Conteúdo editável guardado sem HTML bruto: `JP_RICH_V1:` + JSON versionado e validado contendo blocos e runs. Formato anterior, texto simples, continua suportado. Sem migration, e versões históricas de modelos permanecem acessíveis. Colagem no editor vira texto puro intencionalmente; importar DOCX/TXT continua sendo importação textual e não promete preservar imagens/tabelas/estilos complexos.
- Gerador PDF server-side com fontes Helvetica padrão, bold/italic/underline, títulos e alinhamento, multipágina A4. A prévia usa o mesmo gerador de Exportar e Anexar (sem gerar nova exportação auditada). Texto jurídico deve ser conferido pelo advogado.
- `PetitionTemplateForm`: mesmo editor para modelos próprios e inserção de variáveis no cursor; persistência de formato com os snapshots atuais.
- Pesquisa de clientes por nome/razão social/CPF/CNPJ, com endpoint limitado e escopado à organização; após selecionar cliente, carrega processos vinculados mesmo quando não aparecem entre os primeiros 250.
- Preenchimento adicional de e-mail, WhatsApp, endereço, cidade, estado e CEP do cliente como variáveis opcionais. Dados ausentes continuam visíveis como variáveis pendentes, nunca inventados.
- Barra de ações persistente: Salvar revisão, Visualizar PDF, Baixar PDF, Anexar ao processo. Enviar ao cliente permanece DESABILITADO até o bloco Comunicação; botão informativo é explícito.
- Alertas de erro e sucesso em português, inclusive falhas de conexão em importar/salvar; bloqueio de operações enquanto executam e confirmação antes de trocar cliente/processo com rascunho não salvo. URLs blob de prévia são revogadas ao fechar/sair.

## Segurança e limites

- Endpoints novos exigem sessão, capability do plano, `organizationId` e retorno `no-store`.
- Pesquisa de clientes retorna até 20 resultados por consulta; nunca lista dados de outro escritório.
- Prévia valida `generationId` no mesmo escritório antes de criar PDF. Nenhum endpoint altera R2 ou permite envio por WhatsApp/e-mail.
- O formato de documento aceita somente campos específicos e texto; código HTML, scripts e CSS não são salvos nem renderizados como markup vindo do usuário.
- Seleção cliente/processo permanece revalidada pelo serviço original no backend (não confie em dropdown de frontend).
- PDF gerado pode sofrer substituição de símbolos fora do conjunto WinAnsi: testar acentos, símbolos especiais, peças complexas e layout antes de liberar clientes reais.

## Fora do escopo deste incremento

- Editor com fidelidade Word/DOCX integral (cabeçalhos, rodapés, tabelas, imagens e paginação WYSIWYG perfeita).
- Envio ao cliente e recursos de IA.
- Documentos/ZIP/backup/quotas já cobertos por versões anteriores ou pendentes v40.

## Arquivos relevantes

- `src/components/petition-templates/PetitionPaperEditor.tsx`
- `src/components/petition-templates/PetitionDraftGenerator.tsx`
- `src/components/petition-templates/PetitionTemplateForm.tsx`
- `src/components/petition-templates/PetitionTemplates.module.css`
- `src/modules/petition-templates/domain/rich-document.ts`
- `src/modules/petition-templates/domain/template-variables.ts`
- `src/modules/petition-templates/application/petition-template-service.ts`
- `src/modules/petition-templates/infrastructure/petition-pdf.ts`
- `src/app/api/petition-templates/lookup-clients/route.ts`
- `src/app/api/petition-templates/lookup-processes/route.ts`
- `src/app/api/petition-templates/generations/[id]/preview-pdf/route.ts`

## Verificações

- Testes automatizados de domínio PDF/variáveis/documento rico: 6/6 passaram em execução isolada de TypeScript.
- PDF de teste: `pdfinfo` validou A4, PDF 1.4 e 3 páginas; renderização da primeira página verificada em imagem local.
- Sintaxe dos arquivos TS/TSX: verificada por transpile TypeScript. **Typecheck completo, Next build e teste browser/R2 precisam ser feitos na máquina do usuário**; `npm ci --offline` não conseguiu instalar todas as dependências nesse ambiente. Não declarar produção concluída a partir desses testes parciais.

## Critérios de aceitação no PC

1. Abrir modelo oficial, gerar com cliente pesquisado e escolher processo desse cliente; dados completam as variáveis presentes.
2. Editar, aplicar negrito/título, salvar, visualizar PDF paginado, baixar PDF e abrir.
3. Anexar PDF ao processo e conferir em Documentos via R2 e quota.
4. Criar modelo próprio com variáveis; salvar nova versão; gerar novamente preservando formatação.
5. Confirmar sem cliente/processo indevidos e com campos ausentes bem sinalizados; checar mobile e cliente com mais de 500 cadastros.
6. Enviar ao cliente deve permanecer desabilitado; IA fora desta entrega.
