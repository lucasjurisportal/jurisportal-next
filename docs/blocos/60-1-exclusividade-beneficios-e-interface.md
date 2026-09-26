# v60.1 — Indique e Ganhe: transição exclusiva e visual mais claro

Patch complementar sobre a v60, sem migration nem alteração do banco. O título público permanece **Indique e Ganhe**. A antiga seção separada **Indique e se Remunere** foi incorporada como segundo marco na mesma régua de indicações. O detalhamento fica na janela **Entenda as regras**.

## Regra corrigida

- 0–2 indicados qualificados: progresso para o primeiro marco.
- 3–4 indicados qualificados: elegibilidade **apenas** ao mês gratuito **Premium mensal ativo** (sujeito a conferência e integração financeira).
- 5+ indicados qualificados: passa à elegibilidade **apenas** ao bônus de R$ 30 por mensalidade elegível paga de indicado; NÃO acumula nova elegibilidade a mensalidade gratuita, mesmo que o indicador esteja no Premium.
- O benefício gratuito **já efetivamente usufruído** antes da quinta indicação não sofre cobrança retroativa. A concessão de benefícios pendentes e prevenção de duplicidades devem ser tratadas pelo futuro conciliador Asaas.
- Anuidade não participa. O painel apresenta projeção, não saldo disponível ou repasse comprovado.

A regra é aplicada no domínio `referralProgress`, não só no visual. A API existente consome esse cálculo; os testes verificam 3, 4, 5 e 10 indicações para Premium e fora do Premium. Nenhum repasse é habilitado por este patch.

## Verificação

`npm run test:promotions`, `npm run typecheck`, `npm run build`. Reinicie `npm run dev`; confira cartão, janela explicativa, paleta de temas, vista móvel e estados de 0/3/4/5 indicados (dados de ensaio, sem mexer na produção).

## Git

Use `docs/blocos/60-1-arquivos-patch.txt` para este complemento. Se versões anteriores ficaram fora do commit, inclua seus manifestos 56–60 e confira `git diff --cached --name-only` antes de commitar. **Não execute `git add -A` indiscriminadamente nem adicione `.env.local`.**
