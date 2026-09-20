# Perfil, Notificações e Acessibilidade

## Perfil

O Perfil é acessado pelo avatar no canto superior direito.

Dados principais:
- foto/avatar
- nome
- e-mail
- WhatsApp
- função
- OAB
- UF da OAB
- nível de acesso
- escritório

O perfil não substitui Configurações. Ele representa a conta individual do usuário.

Ações previstas:
- editar dados pessoais/profissionais
- alterar foto
- acessar senha e segurança
- encerrar sessão

## Notificações

O ícone ao lado do avatar abre um painel rápido.

Tipos iniciais:
- publicação/intimação
- prazo
- tarefa
- captura/processo
- falha relevante de sincronização

Cada notificação deverá manter uma referência ao objeto de origem para abrir diretamente o item correspondente.

Recursos:
- badge de não lidas
- marcar todas como lidas
- abrir item relacionado
- preferências em Configurações

## Acessibilidade

Configurações possui uma seção própria de Acessibilidade.

### Tamanho do texto
Níveis iniciais:
- 100%: padrão
- 110%: confortável
- 118%: maior

O limite inicial de 118% existe para preservar a composição visual atual.

Na implementação Next.js real, o dimensionamento deve usar tokens tipográficos/rem, não manipulação ad hoc de estilos.

A escolha é individual e deve persistir por usuário.

## Auxiliar de acessibilidade

Recurso futuro, a ser especificado após levantamento de necessidades reais e validação com padrões de acessibilidade.

Áreas a considerar:
- navegação completa por teclado
- foco visível e previsível
- semântica compatível com leitores de tela
- labels e descrições
- contraste
- redução de dependência exclusiva de cor
- alternativas para interações complexas
- atalhos configuráveis
- apoio contextual acessível

Acessibilidade não deve ser tratada apenas como uma função adicional. A interface base deve seguir boas práticas desde a implementação.
