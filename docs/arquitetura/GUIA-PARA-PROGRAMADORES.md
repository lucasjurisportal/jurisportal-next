# Guia para qualquer programador que entrar no Jurisportal Next

## Antes de escrever código

1. Leia `docs/PADROES-DO-PROJETO.md`.
2. Leia `docs/arquitetura/ARQUITETURA-ALVO.md`.
3. Leia a documentação do módulo alterado.
4. Não altere regra comercial duplicando constante em componente.

## Não fazer

- consulta ao banco dentro de componente visual de cliente;
- `fetch` de tribunal espalhado em tela;
- permissão validada apenas com `display: none`;
- arquivo `utils.ts` com dezenas de regras sem domínio claro;
- usar `any` para silenciar erro;
- guardar segredo em repositório;
- hardcode de preço fora do módulo de planos;
- chamar OpenAI diretamente de componentes;
- deletar histórico jurídico importante fisicamente sem regra explícita.

## Ao terminar uma alteração

- executar lint/typecheck/testes disponíveis;
- testar loading/vazio/erro/sucesso;
- validar desktop e mobile;
- atualizar documentação do módulo;
- registrar mudança no CHANGELOG;
- commit pequeno com descrição objetiva.
