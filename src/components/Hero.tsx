import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, MessageSquare, Users, CreditCard, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-green-50/50 to-emerald-50/30 py-24 min-h-screen flex items-center">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(34,197,94,0.1),transparent_50%)]"></div>
    <div className="container mx-auto px-4 relative z-10">
      <div className="max-w-5xl mx-auto text-center">
        <div className="mb-8"><span className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-green-100/80 to-emerald-100/80 text-green-800 text-sm font-semibold border border-green-200/50 shadow-lg"><Sparkles className="w-4 h-4 mr-2 text-green-600" />Cobrança Automatizada via WhatsApp<CheckCircle className="w-4 h-4 ml-2 text-green-600" /></span></div>
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 mb-8 leading-tight tracking-tight"><span className="block">Automatize suas</span><span className="block bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">cobranças</span><span className="block text-5xl md:text-6xl lg:text-7xl font-bold text-slate-700">de forma inteligente</span></h1>
        <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">O Cobraae conecta você aos seus clientes via <span className="text-green-600 font-semibold">WhatsApp</span>, automatizando todo o processo de cobrança.</p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <Link to="/register"><Button size="lg" className="group bg-gradient-to-r from-green-600 to-emerald-600 text-white px-10 py-6 text-lg font-semibold shadow-xl">Começar Agora<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></Button></Link>
          <Link to="/login"><Button size="lg" variant="outline" className="border-2 border-green-200 px-10 py-6 text-lg font-semibold">Fazer Login</Button></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[{ icon: MessageSquare, title: "WhatsApp", sub: "Integração nativa" }, { icon: Users, title: "Clientes", sub: "Gestão completa" }, { icon: CreditCard, title: "Pagamentos", sub: "PIX e Boleto" }].map((item, i) => (
            <div key={i} className="group p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto"><item.icon className="w-8 h-8 text-white" /></div>
              <div className="font-bold text-slate-900 text-lg">{item.title}</div><div className="text-slate-600 font-medium">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
export default Hero;