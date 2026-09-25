# v55 | Aparência e prontidão do e-mail DJeN

**Base:** ZIP original disponibilizado ao chat + patches incrementais até a v54. Correções manuais feitas na pasta local de Lucas devem ser preservadas ao aplicar o patch. Esta entrega é incremental e não substitui o projeto inteiro.

## 1. Temas da aplicação

Em Configurações → Acessibilidade, 10 temas: branco e azul (padrão), azul-marinho e branco, grafite/chumbo, marsala, preto, dourado/champanhe, oliva, nude, salmão e índigo. Aplicação imediata, sem reload. Preferência salva em `localStorage` por ID do usuário **neste navegador**; não é preferência replicada entre aparelhos nem alteração global do escritório. A landing, login e página pública não recebem o tema. Sem migration e sem armazenar senha/dado jurídico.

As paletas usam barra lateral escura e cartões/tabelas claros para preservar a leitura do conteúdo jurídico, mesmo quando a cor escolhida é preto. Branco sobre as dez cores base da barra lateral e dos botões principais foi checado com contraste mínimo aproximado >=4,5:1. O tema altera a estrutura visual do aplicativo, cores centrais e módulos que usam os tokens existentes; o acabamento visual final ainda deverá verificar todas as telas e estados individuais em celular, tablet e desktop.

Arquivos: `src/modules/appearance/domain/theme.ts`, `AppShell.tsx`, `AppShell.module.css`, `SettingsManager.tsx`, `Settings.module.css`, CSS de Dashboard, Publicações, Ajuda, Plano, Clientes e `src/app/app/layout.tsx`.

## 2. E-mail de publicações: auditoria factual

**Já existia na v54:** fila `publicationEmailDelivery`, agrupamento por advogado e deduplicação da mesma comunicação em mais de uma OAB, texto HTML/texto com CNJ/tipo/resumo, Resend chamado exclusivamente pelo backend, idempotência, reenvio/reconciliação, gatilhos após DJeN manual, confirmação de identidade e endpoint CRON (este último desativado). A v55 NÃO refaz essa integração e NÃO ativa CRON.

**Verificação anterior insuficiente:** `configured` era apenas `Boolean(RESEND_API_KEY && RESEND_FROM)`, contando valores de exemplo como se o serviço estivesse configurado, e a preferência `publicationsEmail` da organização não era checada no envio. A v55 acrescenta pré-validação de variáveis sem expor segredos, respeita o checkbox real e mostra a razão de o envio estar desabilitado na prévia do proprietário. Não há chaves reais nos patches.

**Para homologar em staging, com OAB e destinatários de teste controlados:**
1. Conferir domínio/remetente no painel Resend e conferir os e-mails destinatários da fila já existente antes de habilitar envio. Não ligar envio com filas reais não auditadas.
2. Configurar `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL` (ou `BETTER_AUTH_URL`) em `.env.local` local ou segredos do servidor de staging. Executar `npm run diagnose:publication-email`. A ferramenta lê `.env.local`, não envia e-mail nem mostra valores das variáveis. A validação de formato local **não prova que a chave está ativa nem que o domínio está verificado**.
3. Só após controlar filas/destinatários, habilitar `PUBLICATION_EMAIL_ENABLED="true"` em staging e reiniciar; confirmar Configurações → Notificações → E-mail de publicações marcado. Execute consulta manual com uma OAB de teste e verifique remetente, destinatário, mensagem e Resend. `SENT` no banco significa aceitação pelo provedor, não recebimento final. Conferir caixa postal e logs no painel Resend.
4. Repetir consulta e verificar que não reenviou itens já registrados, testar falha da API, e-mail alterado, duas OABs de um advogado, dois advogados e escritório diferente. Se Resend ficar incerto além da janela de idempotência, reconciliar no provedor antes de novo envio.
5. Desligar a flag se a homologação não continuar. Sem `DJEN_CAPTURE_ENABLED`, sem configuração de CRON neste bloco.

**Não realizado neste ambiente:** teste com Resend real, webhook de entrega, typecheck e build completos, pois `npm ci` não pôde obter todas as dependências. A presença das variáveis de ambiente do usuário não pode ser avaliada em um ZIP sem `.env.local` (correto para segurança). Se faltar configuração, ela só pode ser completada pelo responsável no próprio ambiente.

## 3. Comandos Windows

```powershell
npm run test:appearance
npm run test:publication-email
npm run test:publications
npm run test:notifications
npm run typecheck
npm run build
npm run diagnose:publication-email
```

Se o diagnóstico retornar configuração incompleta, isso exige configurar o staging; **não é falha de compilação**. Nenhuma migration, `db:generate`, `npm install` ou alteração de `package-lock.json` necessária.

## 4. Testes de aceitação de aparência

- Cada uma das dez cores muda barra lateral, interface principal e controles nas telas Dashboard, Processos, Publicações, Configurações, Plano e cobrança e Ajuda.
- Legibilidade do texto e foco de teclado; testar largura de 320/375/390/768/1024 px. Cartões jurídicos mantêm base clara intencionalmente.
- Ao recarregar a aba, mantém-se a cor; ao entrar com outro usuário no mesmo navegador, usa a escolha desse usuário ou o padrão. Em outro aparelho o padrão será exibido até selecionar a cor novamente.
- Login, landing e demais páginas públicas preservam identidade institucional.

## 5. Segurança e limites

- Nenhuma chave API ou credencial vai para o browser. Exibir na prévia apenas códigos sem dados pessoais nem valores de secrets.
- Preferência visual em localStorage inclui só ID de usuário e nome do tema. Nenhuma senha/token é armazenada nesta funcionalidade.
- A escolha de cores não altera autenticação, quotas, isolamento do escritório, autorização de envio ou políticas de privacidade.
- A verificação local do e-mail não substitui validação do domínio Resend, entregabilidade, consentimento de mensagens nem homologação com dois escritórios.
