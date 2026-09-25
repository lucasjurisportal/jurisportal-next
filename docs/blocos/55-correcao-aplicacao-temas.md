# v55 | Correção funcional das cores selecionadas

## Diagnóstico
O seletor salva a preferência (`jp:appearance:<userId>`) e a aplicação atualiza o atributo `data-jp-theme` do contêiner. Porém o CSS da moldura do aplicativo usava cores fixas para sidebar, fundo, cabeçalho e item ativo, mesmo já declarando as paletas como variáveis; por isso a cor selecionada aparecia no seletor, mas a moldura permanecia azul.

## Correções
- Shell, menu lateral, item ativo, cabeçalho, busca e fundo consomem as variáveis da paleta selecionada.
- Salmão corrigido de terracota para rosa-salmão: amostra `#da849d`, sidebar `#a64465` → `#802c49`, fundo `#fff4f7`.
- Branco com azul continua o padrão, sem mudar landing ou login.
- A preferência permanece por usuário/navegador, sem alteração de banco ou segurança.

## Validação
1. Em Configurações > Acessibilidade, selecionar Marsala: sidebar vinho, fundo rosado claro, navegação ativa coerente.
2. Selecionar Salmão: sidebar rosa-salmão, sem tom alaranjado; amostra da paleta também rosada.
3. Ir ao Dashboard e Processos; verificar persistência e atualizar a página (Ctrl+F5).
4. Voltar ao Branco com azul; verificar que o padrão foi restaurado.
5. `npm run test:appearance`, `npm run typecheck`, `npm run build`.

## Limite
Módulos antigos ainda têm cores hexadecimais fixas para alguns elementos locais; tabelas e cartões permanecem claros para legibilidade. Revisão fina de contraste e responsividade em aparelhos reais continua pendente.
