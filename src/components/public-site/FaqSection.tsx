import styles from "./PublicSite.module.css";

const faqs = [
  ["Meus processos ficam visíveis para outros escritórios?", "Não. A arquitetura do Jurisportal Next será construída para separar os dados de cada escritório e limitar o acesso aos usuários autorizados."],
  ["Como meus clientes e os dados deles ficam protegidos?", "O projeto considera controle de acesso, minimização de dados, separação por escritório e registros de ações relevantes. A segurança será tratada desde o banco até a interface."],
  ["O Jurisportal está alinhado à LGPD?", "O Jurisportal Next será desenvolvido considerando os princípios da LGPD e com documentação específica sobre tratamento, acesso, retenção e proteção dos dados."],
  ["Preciso conferir publicações manualmente?", "O monitoramento de publicações e intimações estará presente em todos os planos, respeitando a quantidade de OABs contratada."],
  ["Posso contratar diretamente pelo site?", "Sim. O fluxo do Next será feito para você escolher o plano, concluir o cadastro do escritório e seguir para o pagamento. Nesta primeira versão, o pagamento ainda é apenas visual."],
  ["O sistema funciona no celular?", "Sim. O Jurisportal Next será responsivo desde o início, com o mesmo fluxo principal em desktop, tablet e celular."],
];

export function FaqSection() {
  return (
    <section className="section" id="faq">
      <div className="container">
        <span className="eyebrow">Perguntas frequentes</span>
        <h2 className="section-title">Dúvidas importantes, respostas diretas.</h2>
        <div className={styles.faqList}>
          {faqs.map(([question, answer]) => (
            <details className={styles.faqItem} key={question}>
              <summary>{question}<span>+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
