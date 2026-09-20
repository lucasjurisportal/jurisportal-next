# Bloco 02 - Dashboard do aplicativo

## Objetivo

Transformar a antiga tela de inventário do Jurisportal em um dashboard operacional enxuto, orientado à ação e sem gráficos desnecessários.

## Estrutura atual implementada

- Shell interno com menu lateral reutilizável.
- Logo novo oficial do Jurisportal.
- Busca global visual por processo, cliente ou parte.
- Identificação do escritório e do usuário logado.
- Indicadores clicáveis para publicações, intimações, prazos, audiências e tarefas.
- Área "Precisa da sua atenção" para itens críticos.
- Resumo da carteira de processos sem gráficos.
- Indicador de consumo do limite de processos monitorados.
- Resumo enxuto de atividade da equipe para o proprietário.
- Atividade recente do escritório.
- Próximos compromissos.
- Ações rápidas.
- Estado visual de atualização do DJeN.

## O que não existe no dashboard

- Cadastro de clientes.
- Contadores de fornecedores, parentes, amigos ou cadastros genéricos.
- Distribuição de processos por ano.
- Financeiro contábil.
- Gráficos operacionais.

## Regras de interação

Os números do dashboard devem sempre levar à respectiva tela já filtrada. O dashboard não deve duplicar funcionalidades de outros módulos.

A área de equipe é visível no protótipo do proprietário. A matriz real de permissões será implementada depois que todas as telas forem modeladas.

## Responsividade

A página foi preparada para desktop, tablet e celular. Em telas menores, o menu lateral é reduzido e os blocos são reorganizados em uma coluna.

## Próximos passos

1. Validar visual e hierarquia do dashboard.
2. Ajustar textos, indicadores e densidade conforme feedback.
3. Modelar a página Processos usando o mesmo AppShell.

## Regra de prévias offline

A Landing Page e o sistema interno são visualizados em arquivos separados:

- `landing_Jurisportal.html`: site público.
- `sistema_Jurisportal.html`: sistema interno em construção.

A Landing Page pode exibir apenas um recorte visual do Dashboard para demonstração comercial,
sem botão de acesso ao Dashboard e sem expor nome real de escritório ou dados identificáveis.
O arquivo `sistema_Jurisportal.html` será atualizado a cada nova página interna modelada.
