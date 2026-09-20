# Bloco 26 - Identidade do processo e preparação para migração

## Objetivo

Impedir que um usuário comum altere a identidade CNJ de um processo já confirmado, criar uma referência interna simples para uso diário e manter o domínio preparado para importações futuras de outros sistemas.

## Identidade do processo

Cada processo possui duas referências diferentes:

- `cnjNormalized/cnjFormatted`: identidade judicial oficial;
- `internalCode`: referência interna do escritório, por exemplo `20260001`.

O `internalCode` é gerado pelo Jurisportal, em sequência anual por organização, e não substitui o CNJ.

Na interface, o sistema pode montar dinamicamente uma referência amigável como:

`20260001 - Cliente x Parte contrária`

Os nomes não são gravados dentro do identificador. Assim, correções futuras de clientes/partes não deixam a referência textual desatualizada.

## Bloqueio do CNJ

No cadastro manual o usuário precisa confirmar que revisou o número CNJ. Depois da criação:

- usuários normais podem editar dados operacionais do processo;
- usuários normais não podem alterar o CNJ;
- o backend também bloqueia tentativa direta de alteração;
- `PLATFORM_MASTER`, dentro de `Jurisportal Internal`, pode corrigir o CNJ de teste/controlado;
- correção administrativa exige motivo e gera auditoria com valor anterior e novo.

Uma futura ferramenta administrativa para correção em organização de cliente deve continuar em rota administrativa dedicada. Não remover `organizationId` de rotas normais nem usar superadmin como bypass de tenant.

## Sequência anual

A tabela `process_number_sequence` guarda o último número emitido por organização e ano. A emissão acontece dentro da mesma transação que cria o processo para evitar colisões em cadastros simultâneos.

## Busca

A lista de processos aceita busca por:

- referência interna;
- CNJ;
- cliente;
- parte;
- assunto;
- classe;
- tribunal/comarca.

## Publicações e intimações

A captura DJeN continua vinculando automaticamente uma comunicação quando o CNJ já existe.

Além disso, quando um processo é criado depois de uma comunicação já capturada, o cadastro procura publicações sem processo com o mesmo CNJ e recupera o vínculo automaticamente.

Vínculo manual é bloqueado quando a própria comunicação possui CNJ válido diferente do processo selecionado.

## Preparação para migração futura

O Assistente de Migração não grava arquivos externos diretamente nas tabelas finais. O fluxo futuro será:

`arquivo exportado -> staging -> mapeamento -> validação -> deduplicação -> prévia -> confirmação -> gravação`

Formatos prioritários:

- CSV/XLSX para clientes, processos e partes;
- ZIP de PDFs para documentos;
- JSON/API quando o fornecedor permitir;
- dump SQL apenas como migração administrativa analisada, nunca como upload comum.

Processos importados só entram definitivamente depois da validação de CNJs. Ao confirmar a migração, recebem `internalCode` do Jurisportal e o CNJ fica bloqueado como nos cadastros manuais.

## Limites

Clientes pagos permanecem ilimitados. Processos importados respeitam o limite do plano. Documentos e ZIPs respeitarão a quota de armazenamento da assinatura e o tamanho descompactado será considerado antes da confirmação.
