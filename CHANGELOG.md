# Jurisportal Next v38 — Acabamento funcional, Ajuda, Notificações, Perfil e Dashboard

## Configurações
- WhatsApp removido de Conta e acesso e mantido na ficha cadastral do escritório.
- ficha do escritório consolidada em Configurações.
- linguagem técnica e interna removida da experiência do cliente.
- Suporte com assuntos predefinidos, Outro, mensagem e prazo médio de até 48 horas.
- envio do suporte para `JURISPORTAL_SUPPORT_EMAIL` via Resend.

## Ajuda
- nova rota `/app/ajuda` abaixo de Configurações.
- tutoriais passo a passo dos módulos.
- tutorial contextual ao entrar em cada área.
- opção Não mostrar novamente e possibilidade de reativar pela Central de ajuda.

## Notificações
- sino funcional no topo.
- avisos reais de publicações, prazos, tarefas e agenda.
- contador de não lidas.
- marcar individualmente ou todas como lidas.
- leitura registrada por usuário sem nova tabela.

## Perfil
- menu da foto com Meu perfil, Configurações, Plano e cobrança e Sair.
- gaveta Meu perfil.
- alteração de nome e foto.
- exibição de função, acesso, OAB, escritório e sessão atual.

## Dashboard
- removidos números demonstrativos.
- indicadores reais de publicações, intimações, prazos, tarefas, audiências e processos.
- prioridades reais.
- atividade recente baseada em auditoria.
- agenda dos próximos dias.
- atividade da equipe apenas para o proprietário.

## Segurança e banco
- nenhuma migration nova.
- tenant preservado por `organizationId`.
- dados do Dashboard e notificações sempre derivados da organização ativa.


# v37 — Configurações e importação assistida

- Configurações reais de conta, escritório, OABs, notificações, segurança e acessibilidade.
- Importação owner-only de clientes e processos por CSV/XLSX.
- Mapeamento de colunas, dry-run, validação, duplicidade e limites de plano antes de gravar.
- Importação usa os serviços reais de Clientes/Processos e registra origem `IMPORT`.
- Sem migration nova.

# v36.1 — Relatórios do proprietário e envio diário

- acesso a Relatórios restrito ao proprietário;
- filtro por usuário;
- entrada/saída/última atividade de funcionários por sessão;
- envio automático diário ao e-mail principal/owner;
- rota cron protegida por CRON_SECRET;
- sem migration nova.

# v36 — Relatórios funcionais

- Central `/app/relatorios` conectada aos dados reais do tenant.
- Filtros por período e visão geral operacional/financeira.
- Tabelas de processos, prazos/tarefas, publicações e financeiro.
- Atividade da equipe somente para proprietário com `team.activity`.
- Relatórios avançados a partir do Premium.
- Exportação CSV auditada e protegida contra CSV Formula Injection.
- Impressão/salvar PDF sem blob no PostgreSQL.
- Nenhuma tabela ou migration criada pelo bloco de Relatórios.

## v35.1 - Equipe com OAB obrigatória e inatividade por perfil
- OAB e UF passam a ser obrigatórias para todo auxiliar.
- Criação de auxiliar valida simultaneamente `plan.users` e `plan.oabs`.
- OAB é normalizada pelo domínio existente e duplicidade no mesmo escritório é bloqueada.
- OAB do auxiliar não possui edição direta nesta fase, evitando alternância de inscrições para contornar o plano.
- Remoção desativa a OAB, libera a cota ativa e preserva o registro histórico.
- `TeamMemberProfile` passa a exigir OAB no banco e recebe RLS.
- Funcionários deixam de contar como ativos após 10 minutos e são desconectados após 30 minutos.
- Proprietário/administrador recebe aviso após 1 hora sem uso e é desconectado por segurança.
- Atividade é sincronizada entre abas do Jurisportal.
- Adicionado teste unitário da política de inatividade e ADR-022.
- Modelos de Petições permanecem iguais à v35.

## v34 — Modelos de Petições funcional
- `/app/modelos` deixa de ser item sem rota e vira biblioteca funcional.
- Adicionados modelos-base do Jurisportal e modelos próprios por escritório.
- Modelos próprios possuem histórico de versões imutável.
- Variáveis de cliente, processo, advogado e escritório são resolvidas no backend.
- Cada rascunho gerado registra modelo, origem, versão, processo/cliente e usuário.
- Free continua sem `petitionTemplates.basic`; planos pagos preservam a capability já definida.
- Auditoria do Processo 360 passa a traduzir ações/categorias internas para pt-BR.
- Linha do tempo deixa de expor fontes internas `MANUAL`/`SYSTEM` em inglês.
- Criada pesquisa arquitetural para protocolo judicial futuro via providers, sem implementar essa feature agora.
- Nenhuma dependência npm nova.

# v33.1 — Identidade de processos + vínculo seguro de publicações

- CNJ confirmado no cadastro e bloqueado para usuários normais.
- Correção excepcional pelo PLATFORM_MASTER no Jurisportal Internal exige motivo e gera auditoria.
- Referência interna anual por escritório (`20260001`, `20260002`...).
- Referência amigável derivada em tela sem gravar nomes dentro da identidade.
- Busca de processos também por referência interna.
- Publicações já capturadas são vinculadas automaticamente se o processo com mesmo CNJ for cadastrado depois.
- Vínculo manual de publicação com CNJ divergente passa a ser bloqueado.
- Quotas de armazenamento registradas no catálogo: Free 1 GB, Essencial 10 GB, Estratégico 20 GB, Premium 50 GB, Executivo 100 GB e Alta Corte 200 GB.
- Preparação documental para futura migração de clientes, processos e ZIPs de PDFs.
- Migration `20260918020000_process_identity_lock`.
- Nenhuma dependência npm nova.

# v33 — Publicações e Intimações + DJeN

- Núcleo DJeN reaproveitado seletivamente do JurisAlert, sem incorporar o MicroSaaS inteiro.
- Paginação completa, sanitização, idempotência e deduplicação no PostgreSQL.
- Novas entidades `publication`, `publication_recipient` e `deadline_review`.
- Multi-tenancy por `organizationId` e RLS nas novas tabelas.
- Vínculo automático publicação -> CNJ -> processo quando o cadastro já existe.
- Central `/app/publicacoes` funcional com busca, filtros, status e detalhe.
- Processo 360 passa a mostrar comunicações reais vinculadas.
- Datas literais podem auxiliar a revisão, mas nunca criam prazo automaticamente.
- Confirmação humana cria o mesmo `ProcessWorkItem` já usado por Prazos/Agenda e pode seguir ao Google Calendar.
- Comunicação cancelada na origem preserva histórico e não apaga prazo confirmado.
- Captura e notificações permanecem desacopladas.
- Consulta manual DJeN restrita ao desenvolvimento/PLATFORM_MASTER para validação.
- Migration `20260918010000_publications_djen`.
- Nenhuma dependência npm ou variável de ambiente nova.

# v32 — Google Calendar individual e unidirecional

- OAuth 2.0 individual por usuário/organização.
- Escopo mínimo `calendar.events.owned`.
- Tokens cifrados com AES-256-GCM.
- Prazo, tarefa datada, audiência e compromisso podem ser projetados no Google Calendar.
- Fonte de verdade permanece no Jurisportal.
- Vínculo idempotente evita duplicação de eventos.
- Botões Conectar, Sincronizar agora e Desconectar na Agenda.
- Backfill manual dos próximos 90 dias.
- Nova migration `20260917010000_google_calendar`.
- `pg` permanece fixado em 8.17.2 por compatibilidade documentada.

# v31 — Prazos, Tarefas e Agenda integrados

- Valor da causa adicionado ao processo, com entrada manual nesta fase.
- Honorários percentuais e fixo+percentual calculados automaticamente sobre o valor da causa.
- Valor contratado permanece como fotografia histórica e não muda silenciosamente se o valor da causa for alterado.
- Página global de Prazos e tarefas passou a usar dados reais de `process_work_item`.
- Prazos/tarefas criados no processo aparecem globalmente e vice-versa.
- Agenda passou a projetar automaticamente itens datados sem duplicá-los.
- Criada `agenda_event` para audiências e compromissos.
- Views Hoje, Semana e Mês funcionais.
- Tarefas podem ser editadas; prazos permanecem sem edição simples por exigência de auditoria futura.
- Documentação ADR-013 e ADR-014 adicionada.

# v0.3.0 — Fundação de banco

- Adicionado Prisma ORM 7.10 com PostgreSQL/Supabase.
- Separadas `DATABASE_URL` (runtime pooled) e `DIRECT_URL` (migrations).
- Criado schema inicial para autenticação, organizações, assinatura e auditoria.
- Criado cliente Prisma compartilhado para evitar pools duplicados no hot reload.
- Criado endpoint de saúde `/api/health/database` que testa somente leitura (`SELECT NOW()`).
- Documentadas as decisões de Supabase, Prisma, multi-tenancy e RLS.
- Nenhuma migration é aplicada automaticamente por este pacote.

# Changelog

## v14
- Clientes paginados de 10 em 10.
- Paginação respeita busca e filtros.
- Quantidade de processos por cliente mantida na listagem.
- Criada documentação formal de padrões do projeto e dos blocos já modelados.
- Registrada a diferença entre protótipo visual autocontido e arquitetura final em Next.js.

## v15
- Página Agenda modelada.
- Visões Hoje, Semana e Mês.
- Filtros por tipo de evento e responsável.
- Criação rápida de compromisso com opções avançadas recolhidas.
- Preparada integração futura com Processos, Publicações e Clientes.
- Documentação do bloco Agenda adicionada.

## v16
- Página Prazos e Tarefas modelada.
- Visões de atrasados, hoje, próximos, fatais, pessoais, delegados e concluídos.
- Busca e filtros por responsável e tipo.
- Fluxos separados para Novo prazo e Nova tarefa.
- Integração conceitual com Agenda e futura sincronização com Google Calendar documentadas.
- Documentação do bloco adicionada.

## v17
- Tarefas passaram a ter opção Editar.
- Página Modelos de Petições modelada.
- Biblioteca com modelos Jurisportal e modelos próprios do escritório.
- Busca e filtros por categoria e origem.
- Fluxo visual de criação de modelo.
- Fluxo visual de geração de documento com reaproveitamento de Processo/Cliente.
- Futuro exportador Word e versionamento documentados.

## v18
- Novo modelo agora pode ser criado por upload de DOCX ou escrita direta no Jurisportal.
- Página Relatórios modelada.
- Criados relatórios de processo, operação, equipe, financeiro jurídico, comunicações com clientes e auditoria.
- Histórico visual de relatórios gerados.
- Exportações PDF/XLSX previstas.
- Documentação atualizada.

## v19
- Página Publicações e Intimações modelada.
- Consultas fixas do DJeN em 06h, 12h e 18h.
- Visões de novas, não tratadas, tratadas e comunicações com data expressa.
- Filtros por OAB, responsável e tipo.
- Ações de abrir, criar tarefa, criar prazo, vincular processo e marcar como tratada.
- Drawer lateral de detalhes.
- Documentação do bloco adicionada.

## v20
- Módulo Processos modelado.
- Lista com Ativos, Encerrados, Arquivados e Encontrados.
- Busca e filtros operacionais.
- Cadastro manual mínimo.
- Captura Automática por OAB.
- Página interna do processo com Visão geral, Linha do tempo, Publicações, Prazos e tarefas, Documentos, Financeiro e Histórico.
- Financeiro jurídico contextualizado dentro do processo.
- Regras de cotas, captura e auditoria documentadas.

## v21
- Página Plano e Cobrança modelada.
- Exibição de plano atual, limites e uso.
- Aviso discreto quando usuários/OABs atingem o limite.
- Resumo de cobrança e forma de pagamento.
- Histórico de cobranças e alterações de plano.
- Comparação visual de capacidade entre planos.
- Documentação de segurança, gateway e webhooks adicionada.

## v22
- Avatar do topo passou a abrir o menu de Perfil.
- Criado drawer de Perfil com dados pessoais e profissionais do advogado.
- Ícone de notificações passou a abrir painel de notificações recentes.
- Badge de não lidas e ação para marcar notificações como lidas.
- Adicionada seção Acessibilidade em Configurações.
- Tamanho de texto ajustável em 100%, 110% e 118%, persistente na prévia.
- Auxiliar de acessibilidade futuro registrado no projeto.
- Documentação específica de Perfil, Notificações e Acessibilidade adicionada.

## v23 - Fundação funcional
- Iniciada a transição de protótipo visual para arquitetura funcional modular.
- Criado módulo de Planos com domínio e casos de uso separados da interface.
- Centralizada a tabela promocional e regular com mudança automática após 30/06/2027.
- Essencial regular fixado em R$ 99,99.
- Estratégico atualizado para R$ 129 promocional e R$ 179 regular.
- Premium atualizado para R$ 179 promocional e R$ 249 regular.
- Executivo atualizado para R$ 349 promocional e R$ 449 regular.
- Alta Corte atualizado para R$ 550 promocional e R$ 750 regular.
- Regra anual-base definida como 10 mensalidades para 12 meses de uso (~16,67%).
- Free reduzido a recursos básicos, sem DJeN, IA, financeiro ou equipe.
- IA passa a existir somente a partir do Premium.
- Criados limites internos de IA por plano e pesos por tipo de ação.
- Criados documentos de arquitetura, IA, capabilities, entrega e guia para programadores.
- Landing/Cadastro passaram a ler preços e recursos da nova fonte de verdade de planos.
- `.gitignore` reforçado para ignorar qualquer `.env*` real, preservando apenas `.env.example`.
- Artefato gerado `tsconfig.tsbuildinfo` removido do pacote e ignorado no Git.
- Criadas regras puras para normalização/formatação inicial de número CNJ.
- Criada normalização de OAB preservando zeros/complementos alfanuméricos e validando UF.
- Criada máquina de estado inicial de revisão de prazo: pendente, confirmado ou descartado.
- Confirmar prazo exige ação humana explícita no v1.

## v24 - Conexão PostgreSQL
- Prisma 7 e driver PostgreSQL adicionados.
- Criada conexão runtime com Supabase via `DATABASE_URL`.
- Migrations configuradas para `DIRECT_URL`.
- Criado endpoint de health check de banco.
- Schema inicial de identidade, organização, assinatura e auditoria documentado.

## v25 - Primeira migration
- Primeira migration SQL versionada criada para identidade, multi-tenancy, assinatura e auditoria.
- Adicionados comandos `db:deploy` e `db:status`.
- RLS habilitado explicitamente nas tabelas de tenant, com estratégia de defesa em profundidade documentada.
- Criado ADR específico para isolamento multi-tenant e RLS.
- Nenhuma tabela de domínio jurídico foi criada ainda; o próximo bloco é autenticação real e criação controlada da primeira organização.

## v26 - Autenticação e onboarding real
- Better Auth + adaptador Prisma adicionados com versões fixas.
- Login real por e-mail e senha.
- Cadastro cria identidade real e sessão.
- Onboarding transacional cria escritório, proprietário, perfil, OAB, assinatura e aceites legais.
- Área `/app` protegida server-side.
- Cabeçalho interno passa a mostrar usuário, escritório e plano reais.
- Logout real adicionado.
- Planos pagos ficam `pending_payment` até futura confirmação do gateway.
- Nova migration para perfis, OAB e evidências de aceite.

## v27 - Segurança de conta e administração
- Better Auth atualizado para 1.7.5, alinhando o schema de credenciais utilizado pelo projeto.
- Confirmação de e-mail por código alfanumérico de 5 caracteres.
- OTP com validade de 10 minutos, reenvio após 60 segundos e limite de 5 tentativas.
- Login passa a exigir segundo fator após senha correta.
- Recuperação após bloqueio ocorre somente pelo e-mail verificado.
- Dispositivo confiável implementado com token aleatório, hash no banco e validade absoluta de 15 dias.
- Códigos OTP nunca são persistidos em texto puro.
- Integração inicial com Resend para envio dos códigos.
- Porta de SMS criada, mas sem fornecedor ativo nesta versão.
- Conta `PLATFORM_MASTER` e área `/admin` adicionadas.
- Comando `npm run admin:promote -- email` cria/promove a conta mestre e o escritório `Jurisportal Internal`.
- Tabelas de desafios, dispositivos confiáveis, eventos de segurança e administração adicionadas por migration.
- Trial e assinatura paga permanecem `pending_verification` até a confirmação do e-mail.

## v0.8.0 — Clientes funcional
- Primeiro domínio jurídico persistente.
- PF/PJ, CPF/CNPJ validado, busca, filtros e paginação de 10.
- CEP com preenchimento auxiliar via ViaCEP e fallback manual.
- Arquivamento lógico e auditoria.
- Aplicação de limite de clientes por plano.
- Contexto de tenant obtido exclusivamente no servidor.
- Novo `npm run dev:reset-data`, preservando PLATFORM_MASTER e Jurisportal Internal.
- Testes unitários do validador de CPF/CNPJ.

## v28.4 — Exclusão permanente de clientes

- adiciona exclusão definitiva separada do arquivamento;
- restringe a exclusão permanente ao proprietário da organização;
- adiciona confirmação destrutiva em duas etapas na interface;
- preserva evento mínimo de auditoria antes da remoção;
- documenta bloqueio futuro quando existirem vínculos processuais/financeiros.

## v0.9.0 — Processos funcional
- Clientes passam a ser ilimitados nos planos pagos; Free mantém limite próprio.
- Limites de processos fixados em 10 / 100 / 250 / 500 / 1.000 / 2.000 por plano.
- Criados `Process`, `ProcessClient`, `ProcessParty` e `ProcessTimelineEvent`.
- Cadastro manual de processo com máscara CNJ, cliente principal, clientes adicionais, responsável, tribunal, vara, comarca, classe, assunto e partes.
- Lista real com busca, filtros, paginação e contadores por status.
- Página real do processo com visão geral e linha do tempo.
- Edição e mudanças de status auditadas.
- Arquivar/encerrar não libera vaga do plano.
- Exclusão permanente de cliente passa a ser bloqueada quando houver processo vinculado.
- Sidebar passa a mostrar uso real de processos do plano.
- RLS habilitado nas novas tabelas do domínio.
- Testes de CNJ estrutural e política de capacidade adicionados.

## 0.9.2 — v29.2
- Exclusão permanente de processos restrita ao `PLATFORM_MASTER` no `Jurisportal Internal`.
- Autorização validada no backend, além da ocultação do botão na UI.
- Confirmação dupla antes da exclusão permanente.
- Auditoria `process.deleted_permanently` antes da remoção.
- `organizationSlug` adicionado ao contexto do workspace para decisões internas explícitas.
- Testes unitários da política de exclusão.
- Registrada a futura página detalhada de clientes com seus processos vinculados.

## v0.10.0 — Processo 360 operacional
- Página de processo convertida para abas reais e navegáveis.
- Linha do tempo aceita evento manual auditado.
- Prazos e tarefas persistentes vinculados ao processo.
- Conclusão/reabertura de itens operacionais com timeline e auditoria.
- Financeiro jurídico básico do processo: contrato de honorários, recebimentos, custas e reembolsos.
- Histórico real baseado em `audit_event`.
- Abas de Publicações e Documentos permanecem honestamente desativadas até suas integrações reais.
- Migration `20260916000000_process_workspace` com RLS habilitado.
- Documentação `docs/blocos/22-processo-360-operacional.md` e ADR-012.
