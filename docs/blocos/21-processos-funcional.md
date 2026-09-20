# Bloco 21 — Processos funcional (v29)

## Objetivo
Transformar o módulo Processos em domínio persistente real, isolado por `organizationId`, com limite comercial por plano, vínculo N:N com clientes, responsável, partes e linha do tempo.

## Estrutura
- `prisma/schema.prisma`: modelos `Process`, `ProcessClient`, `ProcessParty`, `ProcessTimelineEvent`.
- `src/modules/processes/domain/`: validação estrutural do CNJ, schema de entrada e política de capacidade.
- `src/modules/processes/application/process-service.ts`: consultas e casos de uso.
- `src/app/api/processes/`: API interna protegida pelo contexto de sessão.
- `src/app/app/processos/`: listagem, cadastro, detalhe e edição.
- `src/components/processes/`: formulários e componentes de status.

## Regras centrais
1. Todo processo possui `organizationId`.
2. O mesmo CNJ não pode existir duas vezes dentro do mesmo escritório.
3. Um processo pode representar vários clientes; um cliente pode participar de vários processos.
4. Exclusão física normal de processo não existe no v1.
5. Encerrar ou arquivar não libera a capacidade comercial consumida.
6. Cliente com processo vinculado não pode ser apagado permanentemente; deve ser arquivado.
7. `FOUND` fica reservado para futura captura automática por OAB.
8. A origem inicial é `MANUAL`; DJeN/OAB/fornecedores futuros serão adaptadores, não regras espalhadas pela UI.
9. A validação CNJ desta versão é estrutural (20 dígitos). O cálculo matemático do DV deve entrar somente com testes próprios.

## Limites comerciais atuais
- Free: 10 processos
- Essencial: 100
- Estratégico: 250
- Premium: 500
- Executivo: 1.000
- Alta Corte: 2.000

Clientes pagos permanecem ilimitados.

## Linha do tempo
Nesta versão registra:
- criação;
- edição;
- alteração de status.

Publicações, prazos, documentos, financeiro e movimentações serão agregados à mesma linha do tempo quando seus módulos forem implementados.

## Exclusão
Não adicionar `DELETE /api/processes/:id` sem revisão arquitetural. Histórico jurídico e política comercial exigem retenção controlada.

## Exclusão permanente de desenvolvimento

A partir da v29.2, apenas `PLATFORM_MASTER` dentro de `jurisportal-internal` pode apagar fisicamente um processo. A autorização é conferida no backend e existe apenas para limpar processos de teste. Escritórios clientes continuam limitados a encerrar, arquivar e reativar.

## Evolução prevista: página detalhada do cliente

Não faz parte do MVP atual, mas está planejada uma rota de detalhe de cliente (`/app/clientes/[id]`) reunindo dados cadastrais, processos vinculados, documentos, histórico e outras informações. O relacionamento N:N `ProcessClient` já permite essa evolução sem duplicar dados.
