# Bloco 31 — Acabamento de UX, Ajuda, Notificações, Perfil e Dashboard

## Objetivo

Fechar a experiência principal do Jurisportal antes de Plano e Cobrança, removendo textos internos da visão do cliente e ligando elementos que ainda estavam apenas no protótipo visual.

## Escopo

- Configurações com linguagem voltada ao usuário final.
- WhatsApp somente na ficha cadastral do escritório, não em Conta e acesso.
- Suporte por formulário com assunto, opção Outro, mensagem e prazo médio de até 48 horas.
- Central Ajuda abaixo de Configurações.
- Tutorial contextual por módulo com opção de não mostrar novamente.
- Sino de notificações ligado a dados reais.
- Menu de perfil e gaveta Meu perfil.
- Foto de perfil usando o campo `User.image` já existente.
- Dashboard alimentado pelos dados reais do escritório.

## Configurações

Conta e acesso mantém somente dados do usuário e senha. Dados do escritório ficam em uma ficha cadastral própria para o proprietário, incluindo razão social, CPF/CNPJ, e-mail administrativo, WhatsApp e endereço.

Textos sobre detalhes internos de implementação, banco, storage ou mecanismos comerciais não devem ser exibidos ao cliente.

## Suporte

A rota `POST /api/settings/support` valida o assunto e a mensagem e usa o mesmo provedor Resend do restante da aplicação.

Variável necessária:

```env
JURISPORTAL_SUPPORT_EMAIL="email-interno@dominio.com"
```

O endereço é interno e não é apresentado na interface. O usuário vê somente o prazo médio de resposta de até 48 horas.

## Ajuda e tutoriais

A rota `/app/ajuda` concentra os tutoriais dos módulos. O `ModuleGuide` identifica a área atual e exibe uma introdução ao entrar no módulo.

A opção `Não mostrar esta explicação novamente` é armazenada no `localStorage` do navegador. Não foi criada tabela ou migration para essa preferência.

A Central de ajuda permite reativar um tutorial específico ou todos.

## Notificações

`GET /api/notifications` deriva os avisos de dados que já existem:

- publicações/intimações não tratadas;
- prazos e tarefas próximos ou atrasados;
- audiências e compromissos próximos.

Não foi criada uma segunda fonte de verdade. A leitura de uma notificação gera um `AuditEvent` `notification.read`, por usuário, para que o sino possa manter o estado lido sem nova tabela.

Funcionários recebem itens atribuídos a eles ou sem responsável; o proprietário acompanha o conjunto do escritório.

## Meu perfil

O menu da foto segue a navegação definida no protótipo:

- Meu perfil;
- Configurações;
- Plano e cobrança;
- Sair.

A gaveta de perfil permite alterar nome e foto e mostra e-mail, escritório, função, nível de acesso, OAB e início da sessão atual. WhatsApp não aparece no perfil pessoal porque pertence à ficha cadastral do escritório nesta fase.

A foto utiliza `User.image`, que já existia no schema, portanto não há migration. Nesta fase aceita JPG, PNG e WebP até 500 KB.

## Dashboard

O Dashboard deixou de usar números demonstrativos. Os cartões e listas são calculados a partir de:

- `Publication`;
- `ProcessWorkItem`;
- `AgendaEvent`;
- `Process`;
- `TeamMemberProfile`;
- `AuditEvent`.

As consultas independentes são executadas em paralelo. A otimização detalhada de performance permanece para um bloco posterior, depois da estabilização funcional.

O proprietário vê atividade recente da equipe; auxiliares recebem atalhos pessoais e não recebem indicadores de produtividade de outros usuários.

## Banco e migrations

Este bloco não altera o schema Prisma e não cria migration.

Ao aplicar sobre o ambiente local do projeto, deve ser preservada a migration criada localmente pelo Prisma `20260917190411_team_oab_required`.

## Testes

- teste puro do mapeamento de rotas para tutoriais;
- validação sintática dos novos TS/TSX;
- `npm run typecheck` no ambiente local completo;
- `npm run test:ui-polish`;
- regressão recomendada: `test:settings`, `test:reports`, `test:team`;
- `npm run build`.
