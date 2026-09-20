# ADR-025 — UX, Ajuda, notificações derivadas e Dashboard real

## Status

Aceito.

## Decisão

Antes de Plano e Cobrança, o Jurisportal fecha a experiência principal do usuário com linguagem humana, ajuda contextual, notificações derivadas dos próprios módulos, perfil funcional e Dashboard real.

Não será criada uma tabela de notificações nesta fase. Avisos são derivados das fontes operacionais existentes e o estado lido é registrado em auditoria por usuário.

A preferência de ocultar tutoriais é local ao navegador e não exige persistência no banco.

O Dashboard consulta as fontes reais e não mantém snapshots próprios nem dados demonstrativos.

## Consequências

- nenhuma migration nova;
- menor risco de divergência entre Dashboard e módulos;
- ausência de uma fila própria de notificações nesta fase, o que é aceitável enquanto os avisos forem derivados de eventos já persistidos;
- performance do Dashboard deverá ser medida e otimizada em etapa própria depois da estabilização funcional.
