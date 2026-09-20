JURISPORTAL NEXT v33.1 - IDENTIDADE DE PROCESSOS E VINCULO SEGURO DE PUBLICACOES

Base: v33 Publicacoes e DJeN.

Inclui:
- CNJ bloqueado para usuarios normais depois da confirmacao;
- confirmacao explicita do CNJ no cadastro;
- correcao excepcional pelo PLATFORM_MASTER no Jurisportal Internal com motivo e auditoria;
- referencia interna anual por escritorio (ex.: 20260001);
- referencia amigavel derivada em tela (ex.: 20260001 - Cliente x Oposto);
- busca por referencia interna;
- recuperacao automatica de publicacoes capturadas antes do cadastro do processo;
- bloqueio de vinculo manual entre publicacao com CNJ e processo de CNJ diferente;
- quotas de storage registradas no catalogo de planos: 1/10/20/50/100/200 GB;
- arquitetura documentada para futura migracao de clientes, processos e ZIPs de PDFs.

Nao adiciona dependencias npm.
Nao implementa ainda o object storage/R2 nem o Assistente de Migracao.
