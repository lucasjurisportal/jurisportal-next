# Modelos de Petições: importação e PDF

## Objetivo
Fechar o fluxo funcional da v34: importar DOCX/TXT como texto editável, revisar o documento gerado e exportar PDF A4.

## Fluxo
1. O usuário seleciona DOCX (até 5 MB) ou TXT (até 1 MB).
2. O servidor valida extensão/estrutura e extrai somente conteúdo textual.
3. O texto entra no formulário normal e só é salvo depois da revisão do advogado.
4. O versionamento existente continua sendo usado sem sobrescrever snapshots anteriores.
5. A geração resolve variáveis a partir do tenant, processo e cliente vinculados.
6. O texto final é editável e pode ser salvo na geração.
7. A exportação cria PDF A4 sob demanda e registra evento de auditoria com SHA-256 do conteúdo exportado.

## Segurança
- DOCX é lido pela estrutura ZIP e somente `word/document.xml` é extraído.
- Há limites do arquivo comprimido e do XML descompactado.
- Nenhum caminho arbitrário do ZIP é materializado no filesystem.
- PDF não é salvo como blob no PostgreSQL.
- Conteúdo real de cliente/processo continua fora do template-base.

## Limitações assumidas
A primeira importação DOCX prioriza texto editável. Cabeçalhos, rodapés, imagens, tabelas complexas e estilos avançados não têm fidelidade garantida.
