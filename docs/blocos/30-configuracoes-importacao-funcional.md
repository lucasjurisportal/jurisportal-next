# Bloco 30 — Configurações e importação funcional

## Objetivo

Transformar `/app/configuracoes` em uma área funcional e adicionar uma primeira camada segura de migração assistida de clientes e processos por CSV/XLSX, sem criar um caminho paralelo às regras já existentes do Jurisportal.

## Acesso

### Todos os usuários autenticados do escritório

- dados da própria conta;
- alteração de senha;
- encerramento das outras sessões do próprio usuário;
- acessibilidade local;
- informações de suporte.

### Somente proprietário (`Member.role = owner`)

- dados do escritório;
- visualização das OABs ativas e consumo do plano;
- preferências administrativas de notificações;
- importação em massa de clientes e processos.

As rotas administrativas validam o papel no backend. Ocultar a aba não é a única barreira.

## Configurações persistidas

Os dados que já possuem estrutura própria continuam nas tabelas existentes:

- `User` e `UserProfile` para conta;
- `Organization` e `OrganizationProfile` para escritório/endereço;
- `LawyerOab` para OABs;
- `Session` para sessões.

Preferências administrativas que ainda não justificam tabela própria são armazenadas de forma versionada no `Organization.metadata`. A atualização preserva chaves desconhecidas existentes.

Nenhuma migration é necessária neste bloco.

## Notificações

A preferência `dailyOwnerReportEmail` é consumida pelo envio automático real do relatório diário. Se o proprietário desativar essa opção, o cron pula o escritório.

Preferências de canais ainda não ativos em produção podem ser registradas, mas a interface informa que a execução depende da integração correspondente.

## Importador de clientes e processos

### Formatos iniciais

- `.csv`;
- `.xlsx`.

O arquivo original é processado durante a requisição e não é armazenado como blob no PostgreSQL.

### Limites da primeira versão síncrona

- até 4 MB por arquivo;
- até 1.000 linhas úteis;
- primeira linha obrigatoriamente usada como cabeçalho;
- cabeçalhos semanticamente duplicados são rejeitados;
- uma planilha por entidade de cada vez.

Arquivos muito maiores pertencem ao futuro Assistente de Migração assíncrona, com staging persistente/jobs, e não devem tornar este bloco síncrono imprevisível.

## Fluxo

```text
CSV/XLSX
  ↓
leitura segura
  ↓
reconhecimento de cabeçalhos
  ↓
mapeamento sugerido e ajustável
  ↓
prévia / dry-run
  ↓
validação de todas as linhas
  ↓
duplicidades + limites do plano + vínculos
  ↓
confirmação explícita do proprietário
  ↓
revalidação
  ↓
createClient() / createProcess()
  ↓
auditoria com origem IMPORT
```

Nenhuma linha é gravada na fase de prévia.

## Importação de clientes

O arquivo pode mapear:

- PF/PJ;
- nome/razão social;
- nome fantasia;
- CPF/CNPJ;
- nascimento;
- contato principal de PJ;
- e-mail;
- WhatsApp/telefone;
- endereço;
- observações.

A validação usa `clientInputSchema` e a gravação usa `createClient()`.

Consequências:

- CPF/CNPJ inválido é rejeitado;
- PJ continua exigindo contato principal;
- campos obrigatórios continuam obrigatórios;
- duplicidade por CPF/CNPJ na organização é bloqueada;
- Free continua respeitando limite de clientes;
- planos pagos continuam ilimitados conforme catálogo.

## Importação de processos

O arquivo pode mapear:

- CNJ;
- CPF/CNPJ do cliente principal;
- documentos de clientes adicionais;
- e-mail do responsável;
- tribunal;
- vara/unidade;
- comarca;
- classe;
- assunto;
- valor da causa;
- data de distribuição;
- parte contrária;
- papel da parte contrária;
- observações.

### Vínculos

- cliente principal: localizado por CPF/CNPJ dentro da organização;
- clientes adicionais: documentos separados por `;`, `,`, `|` ou quebra de linha;
- responsável: localizado por e-mail entre membros da própria organização.

Nome isolado não é usado como chave de vínculo porque pode ser ambíguo.

### Regras preservadas

A gravação usa `createProcess()` real. Portanto:

- CNJ é validado;
- duplicidade por CNJ é bloqueada;
- CNJ só fica definitivamente bloqueado depois da confirmação da importação;
- processo importado consome limite do plano;
- referência interna anual é gerada pelo Jurisportal, nunca aceita da planilha;
- vínculos com clientes são verificados;
- publicações DJeN pendentes com o mesmo CNJ continuam sendo vinculadas automaticamente;
- timeline e auditoria continuam sendo criadas.

`Process.source` recebe `IMPORT`. O histórico não apresenta o registro importado como cadastro manual.

## Modelos CSV

Arquivos de exemplo ficam em:

- `/import-templates/modelo-clientes.csv`;
- `/import-templates/modelo-processos.csv`.

Eles não são obrigatórios. O usuário pode importar planilha originada de outro software e ajustar o mapeamento na prévia.

## Segurança

- importação somente para proprietário;
- `organizationId` vem da sessão, nunca do arquivo;
- vínculos de cliente/responsável são buscados somente no tenant ativo;
- não aceita SQL/dump de banco;
- não aceita referência interna fornecida pelo arquivo;
- não grava arquivo original no PostgreSQL;
- revalida imediatamente antes da gravação;
- usa os serviços de domínio existentes em vez de inserts diretos;
- importação concluída gera `AuditEvent` com contagens.

## Testes

Script do bloco:

```powershell
npm run test:settings
```

Cobre inicialmente:

- sugestão de mapeamento de clientes;
- sugestão de mapeamento de processos;
- detecção de CSV brasileiro por `;`;
- parsing de delimitador/aspas em células CSV.

Além disso, antes de promover a versão:

```powershell
npm run typecheck
npm run test:clients
npm run test:processes
npm run test:reports
npm run build
```

## Dependência adicionada

`read-excel-file@9.3.10` é usada apenas para leitura de `.xlsx` no runtime Node das rotas de importação.

O parser CSV permanece interno e pequeno.

## Limitações conscientes desta versão

- não processa `.xls` legado;
- não importa documentos/ZIP neste bloco;
- não faz importação assíncrona em background;
- não armazena arquivo para retomada posterior;
- não tenta adivinhar vínculo de cliente apenas por nome;
- não cria cliente automaticamente durante importação de processo.

A ordem recomendada é importar clientes, resolver inconsistências e só depois importar processos.
