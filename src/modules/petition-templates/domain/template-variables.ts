import { replaceRichVariables } from "./rich-document";
export const PETITION_TEMPLATE_VARIABLES = [
  ["{{CLIENTE_NOME}}", "Nome do cliente"],
  ["{{CLIENTE_CPF_CNPJ}}", "CPF ou CNPJ do cliente"],
  ["{{CLIENTE_EMAIL}}", "E-mail cadastrado do cliente"],
  ["{{CLIENTE_WHATSAPP}}", "WhatsApp cadastrado do cliente"],
  ["{{CLIENTE_ENDERECO}}", "Endereço completo do cliente"],
  ["{{CLIENTE_CIDADE}}", "Cidade do cliente"],
  ["{{CLIENTE_ESTADO}}", "Estado do cliente"],
  ["{{CLIENTE_CEP}}", "CEP do cliente"],
  ["{{PROCESSO_NUMERO}}", "Número CNJ"],
  ["{{PROCESSO_REFERENCIA}}", "Referência interna do processo"],
  ["{{PROCESSO_VARA}}", "Vara ou unidade"],
  ["{{PROCESSO_COMARCA}}", "Comarca"],
  ["{{PROCESSO_CLASSE}}", "Classe processual"],
  ["{{PROCESSO_ASSUNTO}}", "Assunto do processo"],
  ["{{PARTE_CONTRARIA}}", "Primeira parte contrária cadastrada"],
  ["{{ADVOGADO_NOME}}", "Nome do usuário que gera o documento"],
  ["{{ADVOGADO_OAB}}", "OAB principal do usuário"],
  ["{{ESCRITORIO_NOME}}", "Nome do escritório"],
  ["{{ESCRITORIO_CIDADE}}", "Cidade do escritório"],
  ["{{DATA_ATUAL}}", "Data da geração"],
] as const;

export function replacePetitionVariables(content: string, variables: Record<string, string>) {
  return replaceRichVariables(content, variables);
}
