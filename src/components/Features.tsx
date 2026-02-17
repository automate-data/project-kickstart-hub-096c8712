import { CheckCircle, MessageSquare, Calendar, CreditCard, FileText, Bell, Zap, Shield } from "lucide-react";
const features = [
  { icon: MessageSquare, title: "Cobrança via WhatsApp", description: "Mensagens automáticas personalizadas enviadas diretamente para seus clientes no WhatsApp.", gradient: "from-green-500 to-emerald-600" },
  { icon: Calendar, title: "Controle de Vencimentos", description: "Acompanhe todas as datas de vencimento e envie lembretes automaticamente.", gradient: "from-emerald-500 to-teal-600" },
  { icon: CreditCard, title: "Múltiplas Formas de Pagamento", description: "Ofereça PIX e boleto bancário como opções de pagamento.", gradient: "from-teal-500 to-cyan-600" },
  { icon: FileText, title: "Gestão de Serviços", description: "Cadastre serviços prestados e gerencie parcelas de forma organizada.", gradient: "from-blue-500 to-indigo-600" },
  { icon: Bell, title: "Notificações Inteligentes", description: "Receba alertas sobre pagamentos pendentes e comprovantes recebidos.", gradient: "from-purple-500 to-pink-600" },
  { icon: CheckCircle, title: "Comprovantes Automáticos", description: "Solicite e organize comprovantes de pagamento automaticamente.", gradient: "from-orange-500 to-red-600" }
];
const Features = () => (
  <section className="py-24 bg-gradient-to-br from-white via-slate-50/50 to-green-50/30 relative overflow-hidden">
    <div className="container mx-auto px-4 relative z-10">
      <div className="text-center mb-20"><div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100/80 text-green-800 text-sm font-semibold mb-6"><Zap className="w-4 h-4 mr-2" />Recursos Poderosos</div><h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-6">Recursos que fazem a<span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">diferença</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <div key={index} className="group p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-white/20 hover:border-green-200/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
            <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}><feature.icon className="w-8 h-8 text-white" /></div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3><p className="text-slate-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-16"><div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-semibold"><Shield className="w-5 h-5 mr-2" />Seguro • Confiável • Automatizado</div></div>
    </div>
  </section>
);
export default Features;