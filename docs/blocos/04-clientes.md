# Clientes

## Objetivo
Ter um cadastro único e reutilizável para processos, documentos, comunicações e financeiro jurídico.

## Lista
- Paginação fixa de 10 clientes por página.
- Busca por nome, CPF/CNPJ, telefone ou e-mail.
- Filtros por PF/PJ, processo ativo e UF.
- Mostrar quantidade total de processos e quantidade ativa por cliente.
- Abrir resumo lateral do cliente sem sair da lista.

## Pessoa Física
Nome, CPF, data de nascimento opcional, e-mail, WhatsApp, telefone opcional, endereço e observações.

## Pessoa Jurídica
Razão social, nome fantasia, CNPJ, contato principal, e-mail, WhatsApp, endereço e observações.

## Relações
- Um cliente pode participar de vários processos.
- Um processo pode ter mais de um cliente representado.
- Alterar dados do cliente não duplica informação nos processos; os módulos referenciam o mesmo cadastro.

## Regras futuras
- Normalizar e validar CPF/CNPJ, e-mail e telefone.
- Detectar duplicidade antes de criar.
- CEP com preenchimento automático e fallback manual.
- Ao importar partes de processo, permitir vincular cliente existente ou criar cliente a partir da parte.
