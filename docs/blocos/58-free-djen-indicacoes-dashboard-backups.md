# v58 — Free com DJeN interno, indicações, Dashboard e auditoria de backup

## Base e estado
Patch incremental criado a partir do ZIP de projeto fornecido na conversa e da sobreposição dos patches v41–v57 na ordem histórica. A pasta local de Lucas, inclusive correções manuais e commits posteriores, NÃO foi lida diretamente. Conferir diff antes de sobrescrever arquivos modificados localmente. Não contém dados, segredos, `.env.local`, migrações nem mudança de dependências. O CRON do DJeN permanece desligado.

## Mudanças

1. Plano Free (3 meses): uma OAB, um usuário, dez processos cadastráveis. Concede `djen.monitoring` e `publications.workflow` para receber e ler comunicações dentro do Jurisportal. Não concede `notifications.email`, relatórios ou IA. Resumo determinístico continua disponível internamente para identidade, auditoria e outros usos do domínio, mas não é mostrado como resumo comercial nos painéis Free; o texto integral continua acessível. Consulta DJeN não é acompanhamento integral de todos os andamentos de todos os tribunais. No estado atual a captura é por OAB, e o limite de dez processos é aplicado ao cadastro, não como filtro rigoroso por CNJ na fonte: auditar custos/volume antes do lançamento.
2. Fila Resend: a publicação capturada no Free não cria novo envio; a aprovação manual também respeita o plano. O dispatcher revalida o plano efetivo (incluindo acesso piloto) NO SERVIDOR antes de enviar, inclusive se houver linhas antigas de fila numa organização rebaixada. A fila original não é apagada; se houver entregas antigas, reconciliá-las antes de liberar novos envios. Captura, armazenamento e prazo revisável não dependem de Resend.
3. Indique e Ganhe: na v57, a página Configurações ocultava o código quando o workspace ativo tinha slug `jurisportal-internal`; a rota `/api/referrals/me` também respondia 403. Agora também pode gerar e consultar o código pessoal fixo de PLATFORM_MASTER, sem conceder benefícios financeiros automaticamente. A regra da rota `/api/referrals/claim` continua impedindo que o escritório interno seja convidado, autoindicação e membro do mesmo escritório. Se continuar indisponível: validar migration v57, sessão, org ativa e resposta HTTP; não publicar códigos reais ou dados pessoais.
4. Login: o formulário comum usa `/app/dashboard`; `getCurrentWorkspace` mantém a organização ativa, e para PLATFORM_MASTER sem organização ativa válida usa o workspace interno. Isso explica a conta 'Jurisportal Internal' após login comum e não é prova de vazamento entre escritórios. Não alterar fallback de segurança nem promover membros por rota. Para separar definitivamente o acesso de administrador de conta comercial, o produto exigirá fluxo explícito para seleção de workspace, com testes de permissão.
5. Dashboard: ampliação localizada de tipografia de números, cartões, subtítulos, atividades e atalhos, preservando CSS responsivo e dez temas. A landing/login não são afetados.
6. Backup: a rotina de PDFs possui uma chave estável por arquivo e cópia imutável, logo PDFs NOVOS legítimos aumentam a ocupação; o workflow do banco emite dumps criptografados com timestamp em `daily`, mais cópias em `weekly` e `monthly`. Não há retenção automática comprovada. Adicionado um workflow MANUAL apenas de inventário agregado (`backup-inventory.yml`), usa os segredos R2 existentes e exige permissão de listagem. Ele NÃO modifica objetos. Jamais substituir todo backup pelo último e jamais habilitar eliminação permanente sem restauração homologada. Sugestão a discutir após teste de recuperação: daily 14–30 dias, weekly 8–12 semanas, monthly 12 meses, separando staging/produção. Confirmar retenção/legal/LGPD e offsite independente antes da ativação.

## Testes a executar no Windows

```
npm run test:free-djen
npm run test:promotions
npm run test:publications
npm run test:publication-email
npm run test:notifications
npm run typecheck
npm run build
```

Testes funcionais (staging):
- Escritório fictício Free: uma OAB, consultar DJeN manualmente, ler texto integral, criar prazo após conferência; verificar que não mostra resumo comercial e nenhum e-mail sai mesmo com `PUBLICATION_EMAIL_ENABLED=true`.
- Escritório pago: confirmar e-mail consolidado e funcionamento normal da consulta; simular downgrade em staging e confirmar bloqueio do dispatcher sem excluir publicações.
- Plataforma mestre em Configurações > Conta e acesso: código pessoal aparece; outro escritório utiliza código, sem contabilizar pagamento não confirmado. Verificar que escritório interno não se autoindica.
- Dashboard desktop e celular: conferir legibilidade, truncamentos e contrastes de todos os temas.
- Em GitHub > Actions > Jurisportal - Auditoria de espaco dos backups (somente leitura) > Run workflow: conferir tamanhos daily, weekly, monthly e total no R2. Se AccessDenied por ListBucket, ajustar permissão de listagem da credencial de backup sem conceder DeleteObject; não inserir segredos em logs.

## Critérios de aceite e pendências

Implementação entregue e revisada estaticamente neste ambiente, **não validada contra banco/Resend/R2/CI nem homologada no Windows**. Sem migrations novas. Os backups permanecem intocados; política de retenção efetiva depende de teste de restauração, offsite e decisão expressa. A fila antiga de e-mail deve ser inspecionada para migrações de plano e tentativas incertas antes de reativar disparo amplo.
