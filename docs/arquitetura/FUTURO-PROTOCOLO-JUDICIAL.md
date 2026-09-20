# Futuro — Protocolo judicial a partir do Jurisportal

## Status
Pesquisa arquitetural. Não implementar no MVP atual.

## Viabilidade
O ecossistema PJe possui o Modelo Nacional de Interoperabilidade (MNI). O serviço MNI Client documenta a operação de entrega de manifestação processual, capaz de criar processo (peticionamento) ou anexar documento em processo existente.

Isso não significa que exista uma API pública nacional aberta a qualquer SaaS. O acesso de serviço depende de credenciais/roles e configuração do sistema de destino. Outros tribunais também utilizam eproc, e-SAJ e soluções próprias, exigindo providers separados.

## Arquitetura futura
Criar apenas quando houver acesso real de homologação:

`CourtFilingProvider`
- `PjeMniProvider`
- `EprocProvider`
- `EsajProvider`
- outros providers homologados

## Requisitos mínimos
- autorização explícita do advogado;
- identidade/OAB e credenciais do tribunal;
- assinatura eletrônica/digital compatível com o destino;
- certificado A1/A3 ou integração local quando exigido;
- classificação de classe, assunto, órgão julgador e tipo documental;
- PDFs dentro dos limites do tribunal;
- confirmação humana antes de protocolar;
- idempotência para impedir protocolo duplicado;
- recibo/número de protocolo persistido;
- auditoria completa;
- tratamento de sigilo;
- ambiente de homologação antes de produção.

## Certificados
O segredo privado pertence ao advogado. O PLATFORM_MASTER não deve ter acesso ao segredo em texto claro. A1 deve preferir criptografia controlada e A3 pode exigir componente local/PJeOffice ou solução autorizada.

## Decisão
Não acoplar o módulo de Modelos de Petições ao protocolo. O modelo gera documento; um futuro módulo de protocolo consome um documento já revisado/assinado.
