# ADR-006 - Better Auth e onboarding em duas etapas

## Status
Aceito.

## Contexto
O Jurisportal precisa de autenticação robusta, sessões, multi-tenancy e futura gestão de membros sem reinventar criptografia e fluxos sensíveis. Ao mesmo tempo, dados de endereço, OAB e assinatura pertencem ao domínio do produto e não ao núcleo de autenticação.

## Decisão
Usar Better Auth com adaptador Prisma para identidade/sessão e manter o onboarding de negócio em um módulo próprio.

O cadastro ocorre em duas etapas recuperáveis:
1. identidade e sessão;
2. criação transacional do workspace.

## Por que não colocar tudo em um único callback de autenticação
- aumenta acoplamento entre biblioteca de autenticação e regras comerciais;
- dificulta testes e recuperação de falhas;
- torna futuras trocas de provedor mais caras;
- mistura senha/sessão com endereço, plano, OAB e documentos legais.

## Consequências
- um usuário pode existir temporariamente sem organização se o onboarding falhar;
- a aplicação deve detectar esse estado e redirecionar para retomada;
- rotas internas exigem sessão e membership válidos;
- planos pagos permanecem `pending_payment` até o gateway confirmar pagamento.
