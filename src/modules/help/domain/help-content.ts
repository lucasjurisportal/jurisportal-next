export type HelpModuleKey =
  | "dashboard"
  | "processos"
  | "publicacoes"
  | "prazos"
  | "agenda"
  | "clientes"
  | "equipe"
  | "modelos"
  | "relatorios"
  | "configuracoes";

export type HelpModule = {
  key: HelpModuleKey;
  title: string;
  shortTitle: string;
  description: string;
  steps: string[];
  tips: string[];
};

export const helpModules: HelpModule[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    shortTitle: "Dashboard",
    description: "É a visão rápida do seu dia. Mostra pendências, prazos, publicações, agenda e o que mudou no escritório.",
    steps: [
      "Comece pelos cartões do topo para identificar o que precisa de ação hoje.",
      "Abra a lista de prioridades para tratar prazos, publicações ou compromissos urgentes.",
      "Use Atividade recente para acompanhar mudanças importantes sem abrir módulo por módulo.",
      "Confira os próximos compromissos antes de encerrar a revisão do dia.",
    ],
    tips: ["Os números do Dashboard vêm dos registros reais do escritório.", "Os cartões funcionam como atalhos para os módulos correspondentes."],
  },
  {
    key: "processos",
    title: "Processos",
    shortTitle: "Processos",
    description: "Centraliza os processos do escritório, clientes vinculados, partes, responsável, movimentações, prazos e financeiro.",
    steps: [
      "Use Novo processo para cadastrar o CNJ e os dados principais.",
      "Revise o número CNJ antes de confirmar. Depois do cadastro ele fica protegido contra alteração comum.",
      "Vincule o cliente principal e, quando necessário, outros clientes e partes.",
      "Abra o Processo 360 para trabalhar com linha do tempo, publicações, prazos, documentos, financeiro e histórico.",
    ],
    tips: ["A referência interna é criada automaticamente pelo Jurisportal.", "Use busca e filtros para localizar processos por CNJ, cliente, parte ou assunto."],
  },
  {
    key: "publicacoes",
    title: "Publicações e intimações",
    shortTitle: "Publicações",
    description: "Reúne as comunicações capturadas para as OABs do escritório e ajuda a transformar cada publicação em uma ação revisada.",
    steps: [
      "Comece pelas comunicações novas ou não tratadas.",
      "Abra a publicação para conferir o conteúdo e o processo relacionado.",
      "Quando houver prazo, use Revisar prazo e confirme a data antes de criar o prazo definitivo.",
      "Marque a comunicação como tratada quando a providência necessária estiver definida.",
    ],
    tips: ["O Jurisportal não confirma prazo jurídico sozinho.", "Quando o CNJ já existe, a publicação pode ser vinculada automaticamente ao processo."],
  },
  {
    key: "prazos",
    title: "Prazos e tarefas",
    shortTitle: "Prazos e tarefas",
    description: "Organiza as providências do escritório em uma única lista, sempre vinculadas aos processos.",
    steps: [
      "Use os filtros Hoje, Atrasados e Fatais para definir a ordem de trabalho.",
      "Crie prazo quando houver uma data jurídica obrigatória e tarefa para outras providências.",
      "Defina responsável e prioridade para deixar claro quem deve agir.",
      "Conclua o item quando a providência terminar. O histórico continua preservado.",
    ],
    tips: ["Prazos exigem data; tarefas podem existir sem data.", "Itens com data também aparecem na Agenda."],
  },
  {
    key: "agenda",
    title: "Agenda",
    shortTitle: "Agenda",
    description: "Mostra prazos e tarefas datados junto com audiências e compromissos do escritório.",
    steps: [
      "Alterne entre Hoje, Semana e Mês conforme o planejamento necessário.",
      "Use Novo compromisso para audiências, reuniões e outros eventos.",
      "Filtre por responsável quando quiser conferir a agenda de uma pessoa da equipe.",
      "Se usar Google Calendar, mantenha a integração conectada para projetar os eventos do Jurisportal.",
    ],
    tips: ["Editar um evento no Google não altera o registro jurídico no Jurisportal.", "Tarefas sem data ficam somente em Prazos e tarefas."],
  },
  {
    key: "clientes",
    title: "Clientes",
    shortTitle: "Clientes",
    description: "Mantém a ficha cadastral de pessoas físicas e jurídicas e seus vínculos com processos.",
    steps: [
      "Cadastre o cliente com CPF ou CNPJ e os dados de contato.",
      "Confira endereço e informações principais antes de salvar.",
      "Abra a ficha do cliente para editar dados ou consultar vínculos.",
      "Arquive cadastros que não estão mais em uso em vez de perder o histórico.",
    ],
    tips: ["CPF/CNPJ não pode ser duplicado dentro do mesmo escritório.", "Nos planos pagos, a quantidade de clientes não é o limitador comercial principal."],
  },
  {
    key: "equipe",
    title: "Equipe",
    shortTitle: "Equipe",
    description: "Permite ao proprietário cadastrar auxiliares e controlar o acesso deles ao Jurisportal.",
    steps: [
      "O proprietário cria o auxiliar com nome, e-mail, função, OAB e senha provisória.",
      "No primeiro acesso, o auxiliar precisa trocar a senha provisória.",
      "Defina Nível 1 ou Nível 2 de acordo com as permissões necessárias.",
      "Quando alguém sair da equipe, remova o acesso. O histórico das ações realizadas permanece.",
    ],
    tips: ["Cada auxiliar consome uma vaga de usuário e uma vaga de OAB do plano.", "O histórico considera somente atividades realizadas dentro do Jurisportal."],
  },
  {
    key: "modelos",
    title: "Modelos de petições",
    shortTitle: "Modelos de petições",
    description: "Cria documentos a partir de modelos do Jurisportal ou de arquivos próprios do escritório.",
    steps: [
      "Escolha um modelo-base ou crie um modelo próprio.",
      "Você pode importar DOCX ou TXT e revisar o conteúdo antes de salvar.",
      "Use as variáveis para preencher dados de cliente, processo, advogado e escritório.",
      "Revise o documento final e exporte em PDF quando estiver pronto.",
    ],
    tips: ["Cada alteração do modelo cria uma nova versão.", "Sempre revise o texto final antes de utilizar o documento externamente."],
  },
  {
    key: "relatorios",
    title: "Relatórios",
    shortTitle: "Relatórios",
    description: "Área exclusiva do proprietário para acompanhar operação, financeiro e atividade da equipe.",
    steps: [
      "Escolha o período que deseja analisar.",
      "Use o filtro de usuário para acompanhar um integrante específico da equipe.",
      "Confira entrada, saída, última atividade e ações registradas quando o plano incluir controle de equipe.",
      "Exporte CSV ou use a impressão quando precisar compartilhar ou arquivar uma visão do período.",
    ],
    tips: ["O relatório diário usa os mesmos dados desta área.", "Funcionários não têm acesso aos relatórios do proprietário."],
  },
  {
    key: "configuracoes",
    title: "Configurações",
    shortTitle: "Configurações",
    description: "Reúne dados do escritório, segurança, notificações, importações e preferências pessoais.",
    steps: [
      "Em Conta e acesso, mantenha seu nome e senha atualizados.",
      "O proprietário mantém a ficha cadastral do escritório e as preferências de comunicação.",
      "Use Importar dados para trazer clientes e processos de CSV ou XLSX com validação antes da gravação.",
      "Use Suporte quando precisar falar com o Jurisportal.",
    ],
    tips: ["OABs de auxiliares são administradas junto da Equipe.", "A área Ajuda mantém todos estes tutoriais disponíveis a qualquer momento."],
  },
];

export function helpModuleForPath(pathname: string): HelpModule | null {
  const match = helpModules.find((item) => pathname === `/app/${item.key}` || pathname.startsWith(`/app/${item.key}/`));
  if (match) return match;
  if (pathname === "/app/dashboard") return helpModules.find((item) => item.key === "dashboard") ?? null;
  if (pathname.startsWith("/app/modelos")) return helpModules.find((item) => item.key === "modelos") ?? null;
  if (pathname.startsWith("/app/configuracoes")) return helpModules.find((item) => item.key === "configuracoes") ?? null;
  return null;
}
