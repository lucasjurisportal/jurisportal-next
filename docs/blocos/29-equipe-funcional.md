# Equipe funcional

## Objetivo
Implementar usuários auxiliares estritamente vinculados ao escritório atual, sem conta reutilizada entre organizações nesta fase.

## Criação e cotas
Somente o proprietário pode criar auxiliar. Campos obrigatórios: nome, e-mail, nível de acesso, OAB, UF da OAB e senha provisória. Função/cargo continua opcional.

Cada auxiliar consome simultaneamente:

- 1 vaga de `plan.users`;
- 1 vaga de `plan.oabs`.

O backend confere as duas cotas antes da criação e revalida dentro de transação serializável. A OAB é normalizada pelo mesmo domínio usado no onboarding, deve possuir UF válida e não pode já existir no mesmo escritório.

Um e-mail já existente no Jurisportal é rejeitado para impedir reaproveitamento cross-account.

Nesta fase a OAB do auxiliar não possui edição direta na tela de Equipe. A decisão evita usar uma única vaga de usuário para alternar sucessivamente entre OABs diferentes e contornar o limite comercial. Qualquer fluxo futuro de correção ou substituição de OAB deverá ser explícito, auditado e preservar a regra de quota.

## Persistência da OAB
A criação gera o registro obrigatório em `lawyer_oab`, vinculado ao usuário e ao mesmo `organizationId`.

Quando o auxiliar é removido, sua OAB é marcada como inativa. Ela deixa de ser monitorada e deixa de consumir a cota ativa do plano, mas o registro não é apagado para preservar vínculos históricos de publicações e auditoria.

`TeamMemberProfile.oabState` e `TeamMemberProfile.oabNumber` são obrigatórios no banco. A tabela `team_member_profile` mantém RLS habilitado como segunda barreira de isolamento.

## Primeiro acesso
A senha provisória autentica o usuário, mas o fluxo de login redireciona imediatamente para troca obrigatória. Após a troca, o fluxo normal de segurança e 2FA continua.

## Remoção
Somente o proprietário remove. A membership e as sessões são encerradas, o perfil é marcado como `REMOVED` e a autoria histórica permanece porque o usuário não é apagado. Processos, tarefas e outros registros jurídicos não são apagados nem bloqueiam a remoção.

## Níveis
- Proprietário: gestão da equipe e controle do escritório.
- Nível 2: advogado auxiliar.
- Nível 1: estagiário/apoio.

A camada `team-permissions.ts` mantém permissões de domínio próprias, sem mapear Nível 2 para `admin` do Better Auth. As rotas de criação/remoção validam propriedade no backend.

## Atividade e inatividade
A política diferencia funcionários de contas administrativas.

### Funcionários
- até 10 minutos sem interação: continuam sendo considerados ativos;
- após 10 minutos: deixam de gerar heartbeat de atividade;
- aos 30 minutos sem interação: logout automático.

### Proprietário/administrador
- não participa do indicador de produtividade da equipe;
- não gera heartbeat de atividade de funcionário;
- após 1 hora sem interação, recebe uma mensagem de ausência/segurança;
- em seguida a sessão é encerrada e o login informa que houve logout por inatividade administrativa.

O relógio de interação é compartilhado entre abas do Jurisportal para impedir que uma aba inativa encerre uma sessão que continua sendo usada em outra aba. Ao retomar uma sessão já vencida, a primeira interação não zera silenciosamente o período de inatividade.

Ações jurídicas continuam usando a auditoria existente do Jurisportal. O controle de inatividade não monitora navegador, arquivos, mouse, teclado ou outros programas fora do Jurisportal.
