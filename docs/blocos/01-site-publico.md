# Bloco 01 — Site público, planos e formulários

## Objetivo

Apresentar o Jurisportal Next, conduzir o visitante para cadastro/login e explicar os planos antes da implementação de banco, gateway e autenticação real.

## Rotas

- `/` — Home;
- `/sobre` — Sobre nós;
- `/contato` — Contato e SAC;
- `/termos` — Termos de Uso e Contratação;
- `/privacidade` — Política de Privacidade e LGPD;
- `/login` — Login visual;
- `/cadastro` — Cadastro visual.

## Identidade

- Logo oficial em `public/brand/jurisportal-logo-next.png`.
- Paleta principal: branco, azul royal e azul-marinho.
- Assinatura: **Menos burocracia. Mais advocacia.**
- Chamada principal da Home: **Controle, organize e administre seu escritório com um click.**

## Demonstração da Home

Componente: `src/components/public-site/DemonstrationSection.tsx`.

O carrossel avança automaticamente a cada **5 segundos** e também possui navegação manual por setas e indicadores.

Áreas demonstradas:

1. Visão geral;
2. Processos;
3. Publicações e intimações;
4. Prazos e tarefas.

Ao lado do carrossel existe uma prévia flutuante do Dashboard. Na página pública, nome do escritório e números processuais aparecem mascarados para demonstrar o sistema sem expor informações identificáveis.

## Planos

O protótipo atual possui:

- Free: 3 meses, 1 usuário, 1 OAB cadastrada, até 10 processos, sem DJeN e sem captura automática por OAB;
- Essencial: 1 usuário + 1 OAB;
- Estratégico: 2 usuários + 2 OABs e captura automática por OAB;
- Premium: 3 usuários + 3 OABs e relatório simplificado ao cliente com IA;
- Executivo: 5 usuários + 5 OABs;
- Alta Corte: até 10 usuários + até 10 OABs.

Todos os planos pagos incluem monitoramento de publicações e intimações do DJeN.

Os limites de processos dos planos pagos usados nesta fase são parâmetros de protótipo e ainda podem ser ajustados antes da abertura comercial.

## Cadastro

Componente: `src/components/auth/SignupForm.tsx`.

Fluxo atual:

1. escolher plano;
2. informar dados do escritório;
3. preencher e confirmar e-mail;
4. informar WhatsApp, OAB e UF;
5. informar endereço, com consulta via CEP quando disponível;
6. criar e confirmar senha;
7. aceitar Termos de Uso;
8. confirmar ciência da Política de Privacidade/LGPD;
9. continuar.

Não existe área de cartão nesta etapa.

O seletor de UF contém as **27 unidades federativas do Brasil**.

Validações visuais atuais:

- e-mails devem coincidir;
- senhas devem coincidir;
- senha mínima de 8 caracteres;
- Termos precisam ser aceitos;
- Política de Privacidade precisa ser reconhecida.

## Login

Componente: `src/components/auth/LoginForm.tsx`.

A página possui `← Voltar`, e-mail e senha. A autenticação real ainda não foi conectada.

## CEP

Quando há conexão, o cadastro consulta ViaCEP para preencher logradouro, bairro, cidade e UF. Número e complemento permanecem manuais. Se a consulta falhar, os campos podem ser preenchidos manualmente.

## Prévia offline

Arquivo: `ABRIR-PREVIA-OFFLINE.html`.

É autocontido: CSS, JavaScript, logo e imagem estão incorporados no próprio arquivo. Não depende de pasta de assets ou servidor para renderizar a interface principal.

## Responsividade

Desktop, tablet e celular fazem parte do bloco desde a implementação, não como adaptação posterior.
