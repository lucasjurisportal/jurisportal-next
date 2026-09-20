# ADR-019 - Armazenamento por plano e migração de documentos

## Status

Aceita como regra comercial e arquitetural. Implementação física do storage permanece para o bloco Documentos/R2.

## Quotas base

| Plano | Armazenamento incluído |
|---|---:|
| Free | 1 GB |
| Essencial | 10 GB |
| Estratégico | 20 GB |
| Premium | 50 GB |
| Executivo | 100 GB |
| Alta Corte | 200 GB |

Armazenamento adicional poderá ser vendido separadamente sem exigir troca de plano.

## Regras

- quota de storage é independente dos limites de clientes e processos;
- arquivos existentes permanecem acessíveis ao atingir 100%; novos uploads ficam bloqueados;
- ZIP deve ser contabilizado pelo conteúdo descompactado, não apenas pelo tamanho compactado;
- upload ZIP do processo será exclusivo de PDFs;
- ZIP aninhado, arquivos não PDF e conteúdo inseguro serão rejeitados;
- documentos jurídicos ficam em object storage privado, nunca como blob no PostgreSQL;
- migração de outro sistema deve calcular processos e armazenamento antes da confirmação final.
