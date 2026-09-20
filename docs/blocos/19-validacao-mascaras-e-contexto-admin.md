# Bloco 19 — Validação de formulário, máscaras brasileiras e contexto administrativo

## Objetivo
Corrigir três problemas encontrados durante o teste manual do módulo Clientes e da conta mestre.

## Validação por campo
A API de Clientes já devolvia `fields` com os erros do Zod, mas a interface exibia apenas uma mensagem genérica. A v28.3 passa a:
- destacar visualmente o campo inválido;
- exibir a mensagem específica logo abaixo do campo;
- mover o foco para o primeiro campo inválido;
- limpar o erro daquele campo assim que o usuário volta a editá-lo;
- associar CPF/CNPJ duplicado diretamente ao campo de documento.

A validação definitiva continua no servidor. A interface apenas melhora a orientação do usuário.

## Máscaras de entrada
Criado `src/shared/formatters/br-input.ts` para apresentação:
- CPF: `000.000.000-00`;
- CNPJ: `00.000.000/0000-00`;
- telefone/WhatsApp: `(11) 99999-9999` ou `(11) 3333-4444`;
- CEP: `00000-000`.

A máscara é somente visual. A camada de persistência continua normalizando CPF, CNPJ, telefone e CEP para dígitos, preservando a possibilidade de busca e comparação consistente.

Não foi aplicada máscara rígida ao número do imóvel porque endereços brasileiros podem conter valores como `S/N`, `123-A` e equivalentes.

## Contexto PLATFORM_MASTER
Novas sessões do PLATFORM_MASTER priorizam `Jurisportal Internal` quando não existe uma organização ativa válida. O reset de desenvolvimento também corrige sessões antigas para o ambiente interno.

A página `/admin` ganhou ações distintas para:
- abrir o ambiente interno;
- sair especificamente da administração e retornar a `/admin/login`.

Isso não cria uma segunda identidade ou senha. É a mesma identidade autenticada, com contexto e autorização de plataforma separados dos papéis de escritório.
