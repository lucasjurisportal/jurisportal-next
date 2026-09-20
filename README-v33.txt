JURISPORTAL NEXT v33 — PUBLICAÇÕES E INTIMAÇÕES + DJEN

Base: v32 Google Calendar. Nenhuma arquitetura funcional anterior foi substituída.

NOVIDADES
- Integração DJeN reaproveitando somente o núcleo útil do JurisAlert.
- Paginação completa e reprocessamento idempotente.
- Persistência PostgreSQL por organizationId.
- Novas tabelas: publication, publication_recipient e deadline_review.
- Vínculo automático por CNJ com processo já cadastrado.
- Central /app/publicacoes funcional.
- Publicações reais dentro da aba Publicações do Processo 360.
- Revisão humana obrigatória antes de criar prazo.
- Prazo confirmado continua sendo ProcessWorkItem e segue para Agenda/Google Calendar pelo fluxo existente.
- Tarefa criada de publicação também usa ProcessWorkItem.
- Cancelamento na origem preserva histórico e nunca apaga prazo confirmado silenciosamente.
- Auditoria e RLS mantidos.

NÃO FOI ADICIONADO
- nenhuma dependência npm nova;
- nenhuma variável de ambiente nova;
- IA;
- e-mail automático;
- WhatsApp em produção;
- cron de produção.

O serviço de captura já está preparado para o scheduler 06h/12h/18h, que será conectado no ambiente de deploy.

LEIA
- docs/blocos/25-publicacoes-djen-funcional.md
- docs/decisoes/ADR-017-DJEN-CAPTURA-E-REVISAO-HUMANA.md
