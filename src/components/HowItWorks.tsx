import { UserPlus, FileText, MessageSquare, CreditCard, Sparkles } from "lucide-react";
const steps = [
  { icon: UserPlus, title: "1. Cadastre seus clientes", description: "Registre os dados dos seus clientes e das pessoas que devem pagar.", gradient: "from-green-500 to-emerald-600" },
  { icon: FileText, title: "2. Adicione os serviços", description: "Cadastre os serviços prestados, valores e configure as parcelas.", gradient: "from-emerald-500 to-teal-600" },
  { icon: MessageSquare, title: "3. Cobrança automática", description: "O sistema envia mensagens personalizadas via WhatsApp.", gradient: "from-teal-500 to-cyan-600" },
  { icon: CreditCard, title: "4. Receba os pagamentos", description: "O cliente escolhe entre PIX ou boleto.", gradient: "from-blue-500 to-indigo-600" }
];
const HowItWorks = () => (
  <section className="py-24 bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20">
    <div className="container mx-auto px-4">
      <div className="text-center mb-20"><div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100/80 text-emerald-800 text-sm font-semibold mb-6"><Sparkles className="w-4 h-4 mr-2" />Processo Simples</div><h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-6">Como funciona o<span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Cobraae</span></h2></div>
      <div className="max-w-6xl mx-auto"><div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {steps.map((step, index) => (
          <div key={index} className="group"><div className="flex items-start space-x-6 p-8 bg-white/80 backdrop-blur-sm rounded-3xl border shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2">
            <div className={`w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}><step.icon className="w-8 h-8 text-white" /></div>
            <div><h3 className="text-2xl font-bold text-slate-900 mb-3">{step.title}</h3><p className="text-slate-600 leading-relaxed">{step.description}</p></div>
          </div></div>
        ))}
      </div></div>
    </div>
  </section>
);
export default HowItWorks;