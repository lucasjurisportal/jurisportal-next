# ADR-022: OAB obrigatória na Equipe e política de inatividade por perfil

## Contexto
O limite comercial do Jurisportal controla usuários e OABs separadamente. Permitir auxiliar sem OAB criaria uma brecha para manter uma vaga de equipe sem consumir OAB e associar inscrições diferentes posteriormente. A política de inatividade também precisa distinguir funcionário de proprietário/administrador.

## Decisão
Todo auxiliar criado em Equipe deve possuir OAB e UF válidas desde a criação. O auxiliar consome ao mesmo tempo uma vaga de usuário e uma vaga de OAB do plano.

A OAB não terá edição direta na tela de Equipe nesta fase. A remoção do auxiliar desativa a OAB sem apagar o registro histórico.

Funcionários deixam de contar como ativos após 10 minutos e são desconectados após 30 minutos. Proprietário/administrador não entra no indicador de produtividade, recebe aviso ao completar 1 hora sem uso e é desconectado por segurança.

## Consequências
- `TeamMemberProfile` passa a exigir OAB e UF no banco.
- `lawyer_oab` continua sendo a entidade operacional usada por monitoramento e quota.
- criação de auxiliar valida `plan.users` e `plan.oabs` no backend.
- OAB duplicada no mesmo escritório é rejeitada.
- remoção desativa a OAB e libera apenas a cota ativa, preservando histórico.
- a política de inatividade é aplicada dentro do Jurisportal e sincronizada entre abas do navegador.
- não existe cross-account nesta fase.
