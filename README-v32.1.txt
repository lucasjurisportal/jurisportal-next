Jurisportal Next v32.1 — correções de validação do Google Calendar

Base: v32 canônica.

Correções locais antes do teste OAuth real:
- transferência de responsável remove primeiro a projeção do usuário anterior;
- sincronização manual tenta novamente remoções externas pendentes;
- OAuth state agora também confere usuário e organização que iniciaram a conexão;
- cookies transitórios do OAuth são limpos em sucesso, cancelamento e erro;
- testes do Calendar ampliados para payload, criptografia e URL OAuth.

Nenhum módulo funcional fora da integração Google Calendar foi reescrito.
DJeN/JurisAlert ainda não foi incorporado porque a validação externa do Calendar deve ocorrer antes.

Dependências críticas fixadas nesta revisão:
- Next 16.3.5
- React / React DOM 19.2.8
- TypeScript 5.9.3
- ESLint 9.39.5
- eslint-config-next 16.3.5
- pg permanece 8.17.2

Motivo: eliminar `latest` e impedir atualização silenciosa para versões maiores não validadas.
