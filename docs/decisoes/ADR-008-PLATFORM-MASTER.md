# ADR-008 — Conta mestre da plataforma

## Decisão
Criar papel `PLATFORM_MASTER` fora do modelo de papéis do escritório.

## Regra estrutural
O administrador global não é um `owner` especial. Rotas de tenant continuam recebendo e validando `organizationId`.

## Ambiente interno
O comando de promoção cria/usa `Jurisportal Internal`, vincula a conta como `owner` e atribui assinatura interna baseada no maior plano atual. Novas capabilities devem continuar contemplando o ambiente interno nos guards de autorização.

## Segurança
- 2FA obrigatório;
- e-mail precisa estar verificado antes da promoção;
- promoção só é feita por comando local com acesso ao banco;
- nenhuma senha é definida pelo script;
- eventos administrativos são auditados.
