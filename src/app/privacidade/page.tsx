import { Footer } from "@/components/public-site/Footer";
import { Header } from "@/components/public-site/Header";
import styles from "./privacidade.module.css";

export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main className="section">
        <div className={`container ${styles.content}`}>
          <span className="eyebrow">Privacidade e LGPD</span>
          <h1>Seus dados e os dados dos seus clientes precisam ser tratados com responsabilidade.</h1>
          <p className={styles.lead}>Esta política resume como o Jurisportal pretende tratar dados pessoais e informações do escritório dentro da plataforma.</p>

          <section><h2>Dados tratados</h2><p>Podem ser tratados dados de cadastro, usuários, contatos, OAB, informações do escritório, dados processuais, registros de acesso, dados financeiros necessários à cobrança e informações técnicas de uso.</p></section>
          <section><h2>Finalidades</h2><p>Os dados serão utilizados para criar e administrar contas, prestar os recursos contratados, monitorar publicações e processos, enviar comunicações operacionais, processar cobranças, proteger a plataforma e cumprir obrigações legais.</p></section>
          <section><h2>Escritório e titulares</h2><p>Em muitos tratamentos relacionados aos clientes e processos do escritório, o próprio escritório define as finalidades e atua como controlador. O Jurisportal poderá atuar como operador desses dados quando os tratar em nome do escritório, conforme a situação concreta.</p></section>
          <section><h2>Separação e acesso</h2><p>Os dados operacionais serão vinculados ao escritório responsável. O acesso será limitado aos usuários autorizados e às permissões aplicáveis à conta.</p></section>
          <section><h2>Compartilhamento necessário</h2><p>Dados poderão ser compartilhados com fornecedores essenciais para hospedagem, comunicação, pagamento, suporte e segurança, apenas na medida necessária para a prestação do serviço e sob obrigações adequadas de proteção.</p></section>
          <section><h2>Retenção</h2><p>Os dados serão mantidos pelo período necessário para a execução do contrato, cumprimento de obrigações legais, exercício regular de direitos e demais finalidades legítimas aplicáveis. Dados sem necessidade de retenção deverão ser eliminados ou anonimizados conforme a política definida.</p></section>
          <section><h2>Direitos dos titulares</h2><p>Solicitações relacionadas a acesso, correção, confirmação de tratamento, portabilidade, eliminação e demais direitos previstos na LGPD serão tratadas conforme a função do Jurisportal e do escritório em cada operação.</p></section>
          <section><h2>Segurança</h2><p>O projeto prevê autenticação, controle de acesso, isolamento por escritório, proteção de credenciais, registros de ações relevantes, backups e medidas técnicas proporcionais ao risco dos dados tratados.</p></section>
          <section><h2>Uso comercial dos dados</h2><p>O Jurisportal não vende o conteúdo jurídico, os processos ou os dados dos clientes do escritório como produto comercial.</p></section>
          <section><h2>Contato</h2><p>Dúvidas e solicitações de privacidade poderão ser encaminhadas pelos canais oficiais disponibilizados na página de contato e no rodapé do Jurisportal.</p></section>

          <div className={styles.warning}>A redação final de produção deverá ser revisada após a definição do banco, fornecedores, gateway de pagamento, retenção e fluxos efetivos de dados.</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
