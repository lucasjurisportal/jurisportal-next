export type OfficialPetitionTemplate = {
  slug: string;
  name: string;
  category: string;
  scope: string;
  version: number;
  content: string;
};

export const OFFICIAL_PETITION_TEMPLATES: readonly OfficialPetitionTemplate[] = [
  {
    slug: "procuracao-ad-judicia",
    name: "Procuração ad judicia",
    category: "Procurações",
    scope: "Cliente",
    version: 1,
    content: `PROCURAÇÃO AD JUDICIA\n\nOUTORGANTE: {{CLIENTE_NOME}}, {{CLIENTE_CPF_CNPJ}}.\n\nOUTORGADO(A): {{ADVOGADO_NOME}}, OAB {{ADVOGADO_OAB}}.\n\nPODERES: O(a) outorgante nomeia e constitui seu(sua) procurador(a) para representá-lo(a) judicial e extrajudicialmente, podendo praticar os atos necessários à defesa de seus interesses, observados os poderes que exijam menção expressa em lei.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.\n\n__________________________________\n{{CLIENTE_NOME}}`,
  },
  {
    slug: "substabelecimento",
    name: "Substabelecimento",
    category: "Procurações",
    scope: "Processo",
    version: 1,
    content: `SUBSTABELECIMENTO\n\nProcesso: {{PROCESSO_NUMERO}}\nReferência interna: {{PROCESSO_REFERENCIA}}\n\n{{ADVOGADO_NOME}}, OAB {{ADVOGADO_OAB}}, substabelece os poderes recebidos nos autos acima identificados, nos limites definidos pelo advogado responsável.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.`,
  },
  {
    slug: "contrato-honorarios",
    name: "Contrato de honorários",
    category: "Contratos",
    scope: "Cliente",
    version: 1,
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {{CLIENTE_NOME}}, {{CLIENTE_CPF_CNPJ}}.\nCONTRATADO(A): {{ADVOGADO_NOME}}, OAB {{ADVOGADO_OAB}}.\n\nOBJETO\nA prestação de serviços advocatícios relacionados a {{PROCESSO_ASSUNTO}}.\n\nHONORÁRIOS\nAs condições financeiras deverão ser revisadas e preenchidas pelo advogado antes da assinatura.\n\nDISPOSIÇÕES FINAIS\nO conteúdo deste modelo deve ser adaptado ao caso concreto e às condições efetivamente contratadas.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.`,
  },
  {
    slug: "declaracao-hipossuficiencia",
    name: "Declaração de hipossuficiência",
    category: "Declarações",
    scope: "Cliente",
    version: 1,
    content: `DECLARAÇÃO DE HIPOSSUFICIÊNCIA\n\nEu, {{CLIENTE_NOME}}, {{CLIENTE_CPF_CNPJ}}, declaro, sob minha responsabilidade, que não possuo condições de arcar com as despesas processuais sem prejuízo do meu sustento e/ou de minha família, para os fins legais cabíveis.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.\n\n__________________________________\n{{CLIENTE_NOME}}`,
  },
  {
    slug: "peticao-juntada",
    name: "Petição de juntada",
    category: "Petições simples",
    scope: "Processo",
    version: 1,
    content: `EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA {{PROCESSO_VARA}}\n\nProcesso nº {{PROCESSO_NUMERO}}\n\n{{CLIENTE_NOME}}, já qualificado(a) nos autos, por seu(sua) advogado(a) {{ADVOGADO_NOME}}, OAB {{ADVOGADO_OAB}}, vem, respeitosamente, requerer a juntada dos documentos anexos, para os fins pertinentes.\n\nTermos em que,\nPede deferimento.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.`,
  },
  {
    slug: "manifestacao-simples",
    name: "Manifestação simples",
    category: "Petições simples",
    scope: "Processo",
    version: 1,
    content: `EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA {{PROCESSO_VARA}}\n\nProcesso nº {{PROCESSO_NUMERO}}\n\n{{CLIENTE_NOME}}, já qualificado(a) nos autos em referência, por seu(sua) advogado(a) {{ADVOGADO_NOME}}, OAB {{ADVOGADO_OAB}}, vem, respeitosamente, apresentar MANIFESTAÇÃO.\n\n[DESCREVA A MANIFESTAÇÃO E ADEQUE OS FUNDAMENTOS AO CASO CONCRETO.]\n\nDiante do exposto, requer o que for cabível ao caso.\n\nTermos em que,\nPede deferimento.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.`,
  },
  {
    slug: "contestacao-base",
    name: "Contestação base",
    category: "Defesas",
    scope: "Processo",
    version: 1,
    content: `EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA {{PROCESSO_VARA}}\n\nProcesso nº {{PROCESSO_NUMERO}}\n\n{{CLIENTE_NOME}}, por seu(sua) advogado(a) {{ADVOGADO_NOME}}, OAB {{ADVOGADO_OAB}}, nos autos em que contende com {{PARTE_CONTRARIA}}, vem apresentar CONTESTAÇÃO.\n\nI. SÍNTESE DA DEMANDA\n[REVISAR E PREENCHER.]\n\nII. PRELIMINARES\n[REVISAR APLICABILIDADE.]\n\nIII. MÉRITO\n[DESENVOLVER AS TESES DO CASO CONCRETO.]\n\nIV. PEDIDOS\n[REVISAR E PREENCHER.]\n\nTermos em que,\nPede deferimento.\n\n{{ESCRITORIO_CIDADE}}, {{DATA_ATUAL}}.`,
  },
] as const;

export function getOfficialPetitionTemplate(slug: string) {
  return OFFICIAL_PETITION_TEMPLATES.find((template) => template.slug === slug) ?? null;
}
