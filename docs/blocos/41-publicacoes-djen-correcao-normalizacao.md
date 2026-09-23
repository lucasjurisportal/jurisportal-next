# v41 | Correção de diagnóstico da captura e normalização DJeN

## Incidente

Após a entrega consolidada v41, o usuário reproduziu falha `DJEN_NORMALIZATION_FAILED` ao consultar uma OAB. O código da captura descartava a mensagem da exceção original de `normalizeDjenItem`, impedindo identificar se o registro do CNJ estava sem `datadisponibilizacao` ou com data em formato inesperado. O registro visual não prova qual campo concreto da resposta da fonte provocou a falha. A versão anterior da normalização já exigia data; a nova consulta independente por nome, `meio=D` e a ampliação dos registros examinados podem ter exposto uma resposta que não aparecia no fluxo anterior. **Causa exata depende do diagnóstico de uma nova execução.**

## Alterações

- Preserva o código da causa (`DJEN_PUBLICATION_DATE_MISSING`, `DJEN_PUBLICATION_DATE_INVALID` ou `DJEN_NORMALIZATION_UNEXPECTED`) e anexa somente método OAB/NOME, dia e posição do item. Exibe um aviso de captura incompleta em vez de apresentar zeros em mensagem verde de sucesso.
- Em log do servidor registra apenas código, método, dia, posição e NOMES dos campos de data; não registra conteúdo judicial, nome, CNJ, OAB ou resposta integral da API. Nenhum segredo novo é solicitado.
- Normaliza datas de DISPONIBILIZAÇÃO ISO/ISO com hora e brasileiro `DD/MM/AAAA` apenas se forem datas válidas. Não substitui o campo ausente por `data_publicacao`, pelo dia pesquisado ou pela data atual.
- Mantém cursor no último dia realmente completo quando qualquer item falhar; repescagem é preservada, sem criar publicações, destinatários ou prazos com dados presumidos.
- Testes regressivos para formatos aceitos, ausência de disponibilização e data impossível.

## Arquivos afetados

- `src/modules/integrations/djen/domain/djen-publication.ts`
- `src/modules/integrations/djen/domain/djen-publication.test.ts`
- `src/modules/publications/application/djen-capture-service.ts`
- `src/components/publications/DjenSyncButton.tsx`

## Aplicação e verificação (sem migration e sem alteração de dependências)

```powershell
npm run test:publications
npm run typecheck
npm run build
```

Execute a consulta manual **uma vez**, se não houver erro HTTP 429/403 ativo. Se continuar falhando, o erro terá a forma `DJEN_PUBLICATION_DATE_MISSING [OAB 2026-09-22 item 2]` e o terminal indicará somente os nomes dos campos de data presentes. Isso orienta uma correção específica sem mascarar ou pular comunicação jurídica. Não imprimir o JSON da API em chats/logs públicos.

## Limitações

O patch é baseado no ZIP consolidado v41 entregue neste chat, não em cópia nova do diretório local do usuário. Sem a resposta real da API e sem executar o banco/Next.js no Windows, não é possível afirmar que a falha concreta desapareceu. A validação final necessita execução local. O cron permanece desativado e nenhuma alteração foi feita no Supabase/Prisma ou nos backups.
