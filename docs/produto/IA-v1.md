# IA do Jurisportal Next v1

## Objetivo

Usar IA como ferramenta especializada do fluxo jurídico, não como chatbot generalista.

## Primeiras funções

Disponíveis somente a partir do Premium:

1. Resumir publicação/intimação.
2. Identificar uma data explicitamente escrita no texto.
3. Gerar rascunho de atualização simples para o cliente, sempre para revisão do advogado.
4. Transformar números já calculados pelo sistema em um resumo gerencial curto.

## O que a IA não faz no v1

- não calcula prazo jurídico definitivo sozinha;
- não confirma prazo pelo advogado;
- não envia mensagem ao cliente sem regra/autorização;
- não cria tese jurídica;
- não dá parecer autônomo;
- não substitui conferência do profissional.

## Fluxo de prazo

```text
Publicação chega
-> sistema registra
-> possível prazo fica como REVISÃO NECESSÁRIA
-> advogado lê
-> advogado informa/corrige a data
-> advogado confirma
-> somente então vira prazo definitivo
```

Quando houver uma data expressa, a IA poderá pré-preencher como sugestão, sem confirmar.

## Arquitetura

Os módulos não chamam OpenAI diretamente.

```text
Módulo
-> Jurisportal AI Service
-> AI Provider interface
-> OpenAI adapter
```

Isso permite substituir modelo/fornecedor no futuro.

## Controle de custo

Usar unidades internas e registrar por organização:

- ação;
- unidades consumidas;
- modelo;
- data;
- sucesso/falha;
- tokens/custo quando o fornecedor informar.

A cobrança comercial não deve depender diretamente da palavra "token".

## Privacidade

Enviar apenas o texto necessário para a função.
Evitar CPF, endereço, telefone e outros dados pessoais quando não forem necessários.
Chave de API fica somente no servidor.
