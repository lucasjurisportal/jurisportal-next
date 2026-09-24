# Jurisportal Next v48 — DataJud diagnosticável, Plano e cobrança (prévia) e navegação responsiva

## Base utilizada
ZIP inicial do projeto + patches incrementais entregues neste chat até a v47. Lucas ainda não confirmou commit da v46/v47. Não substituir pasta inteira. Não modificar `.env.local`, migrations, Prisma ou backups. Não incluir `node_modules`/`.next`/`.git`.

## Diagnóstico, sem conclusões não verificadas
O print de cadastro mostra `PROCESS_LOOKUP_TIMEOUT`; isto é **DataJud**, não DJeN. A v47 manteve `18_000` ms para `preview`, apesar de elevar/reduzir timers de outras rotinas; a menor carga de `_source` não elimina latência do cluster, rede ou timeout da plataforma. Não existem logs do computador do Lucas nem confirmação da resposta oficial para aquele CNJ; não alegar causa externa exata ou solução definitivamente homologada.

### Mudanças técnicas de consulta
- Aumenta o orçamento do modo **capa** de 18 s para **45 s**; modo `movements` de 12 s para **20 s**. Variáveis opcionais de ambiente `DATAJUD_PREVIEW_TIMEOUT_MS` / `DATAJUD_MOVEMENTS_TIMEOUT_MS`: valores de 10.000 a 55.000 ms, caso staging exija calibração. **Não habilitar CRON.**
- A rota `/api/processes/lookup` declara `maxDuration = 60` para provedores que respeitam a diretiva, sem prometer que o plano de hospedagem fornecerá 60 s.
- Logs `[datajud.lookup]` de erro incluem somente `mode`, `court`, `code`, `stage` (`connect`/`body`/`parse`), `elapsedMs`, `timeoutMs`, `upstreamTookMs` (quando houver) e status HTTP. CNJ, nomes, e-mails, chave e conteúdo ficam fora.
- Script `npm run diagnose:datajud -- NUMERO_CNJ` carrega `.env.local` **somente na máquina de Lucas** e executa 1 consulta de capa; imprime duração, código de erro e quantidade de campos; **não** revela chave/CNJ/resposta. Não usar processo sigiloso; nunca colar número no chat. Se a fonte pública não responde em 45 s, isso não é defeito corrigível exclusivamente por frontend; confirmar a rota/rede e ambiente. Não repetir chamadas agressivamente.
- Não altera a regra de isolamento por `organizationId`, o vínculo ao processo nem a importação das peças. O cadastro manual continua disponível e o DataJud pode não informar comarca, fórum, valor ou distribuição.

## Plano e cobrança, SOMENTE VISUAL
- Cria rota `/app/plano` com login/2FA e role `owner` obrigatórios, reutilizando o contexto do escritório e o catálogo comercial existente. Exibe plano, status registrado, modalidade, limites, visualização das opções e preços, dados existentes de identificação e placeholders de cobrança. A seleção de outro plano não grava dados nem altera a assinatura.
- Meios Pix/boleto/cartão, confirmação e histórico ficam desativados/sem faturas fictícias; sem Asaas, credenciais, webhook, API de pagamento ou coleta de cartão. Ao ativar pagamento de verdade, definir estado financeiro, idempotência de webhook, gateway, notas/recibos, política de trial/cancelamento e segurança.
- **Catálogo existente está defasado para IA**: Estratégico 0, Executivo 2.500, Alta Corte 10.000 na base, diferindo da especificação mais recente (100/2.000/5.000). Esta v48 NÃO altera entitlements, planos cobrados, nem afirma créditos de IA como funcionalidade entregue. Revisar no bloco IA/precificação antes de disponibilizar cobrança.

## Responsividade
- CSS do sistema, landing e login já tinha breakpoints, mas menu principal do sistema desaparecia abaixo de 760 px e links da landing desapareciam abaixo de 1080 px sem alternativa. Introduz controles de menu por teclado/toque com `aria-expanded`, acesso às telas no celular, fecha menu ao navegar, não perde login público no celular. Plano usa grade 4→2→1 e 3→2→1 para tablets e celular.
- **Não comprova** responsividade de todos os módulos e dispositivos: realizar QA visual funcional em ~320/375/390/768/1024/1440 px e orientação paisagem, zoom 200%, toque, overflow de tabelas, formulários, modais e navegação. A landing final continua prevista para fechamento do produto.

## Instalação/testes
Extraia normalmente por cima da base local (sem descartar modificações novas feitas depois do ZIP v47). Não há migration, `npm install` adicional ou `prisma generate` nesta atualização.

```
npm run test:process-lookup
npm run test:publications
npm run typecheck
npm run build
npm run dev
```

Validação no navegador: processo público que já funcionou; a consulta agora aguarda até 45 segundos. Se persistir erro, **uma única chamada** de diagnóstico no seu computador com o mesmo CNJ: `npm run diagnose:datajud -- 10000000000000000000` (SUBSTITUIR por CNJ real, não compartilhar número). Trazer apenas o bloco `[datajud.lookup]` sem dados pessoais e a saída sanitizada do script. Consultas mais lentas que 45s devem ser tratadas como limitação do provedor/da rede, não alongando indefinidamente a experiência do usuário.

Validação UI: `/app/plano` para proprietário; bloqueado para auxiliar; escolha visual não altera assinatura; Pix/boleto/cartão desabilitados; menus acessíveis no celular e login público visível.

## Execução neste ambiente
Transpilação/sintaxe TypeScript e TSX dos arquivos modificados aprovada com `typescript.transpileModule` global. `npm run typecheck` foi tentado, mas o ZIP não contém dependências npm reais (apenas diretórios vazios de `node_modules`); TS2688 para definições de tipos ausentes. `build`/testes de dependências, DataJud real, banco e responsividade visual em aparelho NÃO puderam ser homologados aqui; testes com Windows são obrigatórios. Não alterar `.env.local` nem enviar segredos.
