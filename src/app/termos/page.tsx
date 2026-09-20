import { Footer } from "@/components/public-site/Footer";
import { Header } from "@/components/public-site/Header";
import styles from "./termos.module.css";

export default function TermosPage() {
  return (
    <>
      <Header />
      <main className="section">
        <div className={`container ${styles.content}`}>
          <span className="eyebrow">Termos de Uso e Contratação</span>
          <h1>Regras claras para usar e contratar o Jurisportal.</h1>
          <p className={styles.lead}>
            Estes termos definem as regras básicas de acesso, contratação, cobrança e uso da plataforma Jurisportal.
          </p>

          <section>
            <h2>1. Conta e responsabilidade de acesso</h2>
            <p>O responsável pelo cadastro deve fornecer informações verdadeiras e manter suas credenciais protegidas. Cada usuário deve utilizar acesso individual quando essa função estiver disponível no plano contratado.</p>
          </section>

          <section>
            <h2>2. Planos e recursos</h2>
            <p>Os recursos disponíveis, quantidade de OABs monitoradas, usuários e demais limites seguem o plano escolhido no momento da contratação. Upgrades e downgrades poderão alterar limites e recursos disponíveis.</p>
          </section>

          <section>
            <h2>3. Cobrança e renovação</h2>
            <p>O valor, a periodicidade e o ciclo de cobrança serão apresentados antes da confirmação da contratação. Planos recorrentes poderão ser renovados automaticamente conforme a opção escolhida, até que haja pedido de cancelamento nos termos aplicáveis ao plano.</p>
            <p>Falhas ou atrasos de pagamento poderão gerar tentativas de cobrança, avisos ao responsável e restrição temporária de acesso após comunicação adequada. Nenhuma cobrança será feita nesta versão de desenvolvimento até a integração do gateway.</p>
          </section>

          <section>
            <h2>4. Publicações, intimações e informações processuais</h2>
            <p>O Jurisportal auxilia a organização e o monitoramento das informações jurídicas contratadas. A plataforma não substitui a responsabilidade profissional do advogado de acompanhar processos, prazos, fontes oficiais e comunicações judiciais aplicáveis ao caso.</p>
            <p>Serviços externos, tribunais, diários oficiais e fontes de terceiros podem sofrer indisponibilidades ou mudanças técnicas fora do controle do Jurisportal.</p>
          </section>

          <section>
            <h2>5. Dados e confidencialidade</h2>
            <p>Os dados do escritório e de seus clientes devem ser utilizados apenas para as finalidades da plataforma e tratados de acordo com a Política de Privacidade e a legislação aplicável. O Jurisportal não comercializa o conteúdo jurídico armazenado pelo escritório.</p>
          </section>

          <section>
            <h2>6. Segurança e uso permitido</h2>
            <ul>
              <li>não compartilhar credenciais de forma insegura;</li>
              <li>não tentar acessar dados de outro escritório;</li>
              <li>não explorar falhas, realizar engenharia reversa indevida ou contornar controles de segurança;</li>
              <li>não utilizar a plataforma para atividades ilícitas.</li>
            </ul>
          </section>

          <section>
            <h2>7. Disponibilidade e manutenção</h2>
            <p>A plataforma poderá passar por atualizações, manutenção e correções. Quando possível, intervenções planejadas que afetem significativamente o serviço serão comunicadas aos usuários.</p>
          </section>

          <section>
            <h2>8. Cancelamento e encerramento</h2>
            <p>O pedido de cancelamento interrompe renovações futuras conforme as regras do ciclo contratado. Obrigações já vencidas permanecem devidas. Antes da exclusão definitiva de dados, serão observadas as regras de retenção, segurança e obrigações legais aplicáveis.</p>
          </section>

          <section>
            <h2>9. Alterações relevantes</h2>
            <p>Alterações materiais nestes termos, especialmente as que afetem cobrança, privacidade ou uso dos dados, deverão ser comunicadas de forma adequada antes de produzirem efeitos quando isso for exigido.</p>
          </section>

          <div className={styles.meta}>
            Texto-base do Jurisportal Next. A versão publicada em produção deverá passar por revisão jurídica final junto com a política de cobrança, privacidade e retenção de dados.
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
