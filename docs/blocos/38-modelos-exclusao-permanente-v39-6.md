# Jurisportal Next v39.6 — Exclusão permanente de modelos próprios

**Contexto:** refinamento da v39.5, ainda no fechamento de Documentos + Modelos de Petições. **Não encerra v40**: documentação consolidada continua prevista após concluir backups/restauração e testes.

## Necessidade

Antes só existia **Arquivar modelo** / **Restaurar modelo**. Ao importar um DOCX/TXT incorreto ou criar um modelo errado, não havia opção de remoção definitiva da base reutilizável.

## Comportamento implementado

- Em **Biblioteca de modelos > Seus modelos**, cada modelo próprio apresenta ação **Excluir permanentemente** para o proprietário ou seu criador.
- A ação também aparece no detalhe do modelo, ativo ou arquivado.
- Diálogo explícito exige digitar `EXCLUIR`, esclarece irreversibilidade e informa que peças já geradas/PDFs anexados não são apagados.
- Após sucesso, biblioteca é atualizada e a página de detalhe redireciona para a biblioteca.
- Falhas de acesso/sessão/conexão são comunicadas em português; não declarar sucesso antes da confirmação do servidor.
- Modelos-base oficiais do Jurisportal não são excluíveis, porque são definidos no código e não na tabela de modelos do escritório. Se o advogado copiar um oficial e criar modelo próprio, pode remover **a cópia própria**.

## Segurança e integridade

- Requisição `DELETE /api/petition-templates/[id]` exige sessão/segundo fator/organização por meio de `getAppContext()`.
- O serviço valida `organizationId` e autoriza somente **proprietário** do escritório ou **criador daquele modelo**. O usuário de outro escritório recebe 404 sem vazar existência do registro.
- Todas as alterações são transacionais; elimina `PetitionTemplateVersion`, o modelo e seu conteúdo.
- `PetitionGeneration` não é apagada: `templateId` fica `null` e os dados já renderizados/revisados (`renderedContent`, `finalContent`, `templateName`, `templateVersion`) continuam disponíveis. PDFs salvos no R2 não são tocados.
- Evento de auditoria `petition_template.deleted_permanently` mantém ID, autor, horário, quantidade de versões removidas e rascunhos preservados, **sem conteúdo/nome da base removida**.
- Sem nova migration, dependência, variável de ambiente, alteração de quotas ou alteração em R2.

## Limites

- 'Permanente' significa remoção dos registros ativos no banco. Cópias de backup previamente realizadas seguem a política de retenção aplicável e não são apagadas por esta ação de interface.
- Não foi criada função de exclusão de rascunhos/peças já geradas; trata-se de outro registro com finalidade e histórico distintos.

## Arquivos do incremento

- `src/modules/petition-templates/application/petition-template-service.ts`
- `src/app/api/petition-templates/[id]/route.ts`
- `src/components/petition-templates/PetitionTemplateDeleteButton.tsx`
- `src/components/petition-templates/PetitionTemplates.module.css`
- `src/app/app/modelos/page.tsx`
- `src/app/app/modelos/[id]/page.tsx`

## Validação

- Sintaxe TS/TSX dos cinco arquivos alterados/criados validada localmente por TypeScript transpile.
- Verificadas no schema e na migration existentes as relações: versões `onDelete: Cascade` e gerações `onDelete: SetNull`.
- **Pendente na máquina do usuário:** `npm run typecheck`, `npm run build`, fluxo real de exclusão para proprietário/criador, 403 para outro auxiliar, 404 cross-tenant, preservação de gerações e PDFs, e falha segura de rede.
