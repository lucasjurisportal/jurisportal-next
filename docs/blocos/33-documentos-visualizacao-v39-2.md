# v39.2 — Visualização de PDF e limites de envio

## Atualização incremental

Substituir somente `src/components/documents/ProcessDocuments.tsx` e `src/components/documents/ProcessDocuments.module.css` a partir da v39.1 validada pelo usuário. Arquivo de documentação adicional em `docs/blocos/`.

## Funcionalidades

- O limite de **50 MB por PDF** aparece ao lado do botão Enviar PDFs, antes de selecionar arquivos; a validação existente continua no navegador e no backend.
- Botão **Visualizar** nos PDFs ativos: solicita autorização à API de download existente, carrega o PDF autorizado do R2 e cria um `blob:` local. O leitor embutido usa o visualizador nativo do navegador dentro da aba Documentos. A URL assinada não entra no `src` do iframe.
- Botões **Baixar** e **Fechar visualização** sem sair do processo; revogação da URL temporária ao fechar, trocar documento ou desmontar o componente.
- Mensagens de carregamento e falha (inclusive CORS GET) e fallback Baixar se o navegador não suportar PDF embutido.
- Área lateral de ações jurídicas predefinidas **VISUALMENTE PREPARADA, MAS DESABILITADA**. Nada chama a OpenAI e não há caixa de texto livre. Resumo por página exige um leitor que identifique a página real; o iframe nativo não expõe essa informação ao Jurisportal.

## Limitações e segurança

- Prévia faz download completo do PDF para a memória do navegador (limite atual de 50 MB por arquivo). Não é streaming nem é ideal para autos extensos.
- Blob local impede que a URL assinada seja exibida no iframe, porém o usuário autorizado ainda tem acesso ao arquivo e pode baixá-lo. Não é DRM.
- A prévia utiliza o endpoint existente, com autorização por escritório/processo. Não exige migration ou nova variável de ambiente.
- CORS deve permitir GET da origem real do Jurisportal para que o navegador leia o arquivo (configuração já presente no guia da v39).
- Testar manualmente em Chrome/Edge e mobile, PDF válido, PDF corrompido, falha de rede, exclusão durante prévia, troca rápida de documentos e logout.
- A funcionalidade de IA só será ativada depois da integração de modelos/créditos/controles; **não implementar botão funcional de resumo de página sem identificar a página corretamente**.
