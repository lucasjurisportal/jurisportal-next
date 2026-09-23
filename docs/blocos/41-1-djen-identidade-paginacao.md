# Jurisportal Next v41.1 | DJeN, identidade e captura completa

## Base conferida
ZIP `Projeto Jurisportal Next(3).zip`, contém `docs/blocos/40-consolidacao-documentos-peticoes-backup.md`; patch sobre esta base, sem schema/migration, dependências ou mudanças nos módulos de backup.

## Alterações desta etapa
- Associação automática exige OAB normalizada completa (inclui sufixo), UF e nome completo normalizado do usuário titular da OAB. Nome faltante, nome divergente, sufixo divergente e ausência de advogados **não** geram publicação/recipiente/prazo automaticamente; contador `unverifiedItems` registra itens de consulta rejeitados, inclusive resultados repetidos entre variantes. Não é uma fila persistente de revisão; será necessário desenhá-la antes de liberar produção.
- Erro ao normalizar item e resultado paginado incompleto (página vazia, página curta antes de count, teto 200 páginas) falham a captura da inscrição e aparecem em `errors`, evitando falsos sucessos silenciosos. O comportamento HTTP 403/429 existente não foi alterado.
- A busca continua somente por número OAB/UF. Busca independente por nome **não** foi implementada, pois parâmetros e contrato da fonte exigem homologação. A consulta existente não representa todos os andamentos processuais.
- Deduplicação existente por `organizationId/source/externalKey`, vínculo CNJ e revisão humana de prazo mantidos. Não ativado cron/worker nem cursor persistente; não declarar monitoramento automático contínuo.

## Atenções operacionais
O `user.name` atual é a fonte de nome do titular de LawyerOab, mas não há campo de nome/OAB legal verificado nem tipo de inscrição separado. Caso `user.name` seja nome social, abreviado ou diferente da grafia da OAB, a comunicação é bloqueada para associação automática. Isto prioriza não atribuir a pessoa errada, mas implica falsos negativos até termos cadastro jurídico verificado e revisão humana. Não enviar comunicação não verificada por e-mail/WhatsApp.

## Aplicação
Copie somente os quatro arquivos com a mesma estrutura de pastas para a raiz local do projeto atual, após verificar que a pasta local corresponde ao ZIP. Não apague a pasta nem extraia o ZIP base sobre mudanças locais. Não há migration.

```powershell
cd 'C:\Users\Pichau\Desktop\Projeto Jurisportal Next'
git status --short
npm run test:publications
npm run typecheck
npm run build
git status --short
git diff -- src/modules/integrations/djen/domain/djen-publication.ts src/modules/integrations/djen/domain/djen-publication.test.ts src/modules/integrations/djen/infrastructure/djen-client.ts src/modules/publications/application/djen-capture-service.ts
```

## Verificação neste ambiente
Leitura/auditoria dos arquivos e patch concluídos. Foi tentado `npm ci --ignore-scripts --no-audit --no-fund`, mas expirou sem instalar dependências, portanto **test:publications, typecheck e build NÃO foram executados com sucesso neste ambiente**. Rodar os comandos acima antes de commitar. NÃO executar consultas reais com dados de clientes sem revisar nome legal/OAB e fluxo de revisão.
