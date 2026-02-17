import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, FileText, Calendar, CreditCard, Bell, TrendingUp, Clock, AlertTriangle, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const getGreeting = () => { const hour = new Date().getHours(); if (hour >= 5 && hour < 12) return "Bom dia"; if (hour >= 12 && hour < 18) return "Boa tarde"; return "Boa noite"; };
const getFirstName = (fullName: string) => fullName?.split(' ')[0] || 'Usuário';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: dashboardData, isLoading, error } = useDashboardStats();

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const stats = dashboardData ? [
    { title: "Cobranças Pendentes", value: dashboardData.cobrancasPendentes.toString(), icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-50", change: formatCurrency(dashboardData.valorPendente), changeColor: "text-gray-600" },
    { title: "Cobranças Pagas", value: dashboardData.cobrancasPagas.toString(), icon: CreditCard, color: "text-green-600", bgColor: "bg-green-50", change: formatCurrency(dashboardData.valorPago), changeColor: "text-gray-600" },
    { title: "Clientes Ativos", value: dashboardData.clientesAtivos.toString(), icon: Users, color: "text-blue-600", bgColor: "bg-blue-50", change: dashboardData.clientesAtivos > 0 ? "Clientes cadastrados" : "Nenhum cliente cadastrado", changeColor: "text-gray-500" },
    { title: "Receita do Mês", value: formatCurrency(dashboardData.receitaMes), icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-50", change: "Pagamentos recebidos este mês", changeColor: "text-gray-500" },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b backdrop-blur-sm bg-white/95">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"><MessageSquare className="w-6 h-6 text-white" /></div>
            <div className="hidden sm:block"><span className="text-xl font-bold text-gray-800">Cobraae</span><p className="text-sm text-gray-500">Sistema de Cobrança</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}><Settings className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}><span className="hidden sm:inline">Sair</span><span className="sm:hidden">✕</span></Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">{getGreeting()}, {getFirstName(user?.name || '')}!</h1>
          <p className="text-gray-600 text-sm md:text-lg">Aqui está um resumo do seu negócio hoje</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? ([1,2,3,4].map(i => <Card key={i} className="border-0 shadow-lg"><CardContent className="p-6"><Skeleton className="w-12 h-12 rounded-xl mb-4" /><Skeleton className="h-8 w-16" /></CardContent></Card>))
          : error ? (<div className="col-span-4 text-center p-8"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" /><p className="text-red-600 font-medium">Erro ao carregar estatísticas</p></div>)
          : stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className={`absolute inset-0 ${stat.bgColor} opacity-50`}></div>
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
                  <div className="text-right"><p className="text-sm font-medium text-gray-600">{stat.title}</p><p className="text-3xl font-bold text-gray-900">{stat.value}</p></div>
                </div>
                <span className={`text-sm font-medium ${stat.changeColor}`}>{stat.change}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader><CardTitle className="text-xl">Ações Rápidas</CardTitle><CardDescription>Acesse rapidamente as principais funcionalidades</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {[
                    { to: "/chatbot", icon: MessageSquare, title: "Chatbot WhatsApp", desc: "Configure mensagens automáticas", colors: "from-blue-50 to-blue-100 border-blue-200", iconBg: "bg-blue-500" },
                    { to: "/clients", icon: Users, title: "Gerenciar Clientes", desc: "Cadastre e gerencie clientes", colors: "from-green-50 to-green-100 border-green-200", iconBg: "bg-green-500" },
                    { to: "/services", icon: FileText, title: "Cadastro de Serviços", desc: "Registre o seu catálogo de serviços", colors: "from-purple-50 to-purple-100 border-purple-200", iconBg: "bg-purple-500" },
                    { to: "/cobrancas", icon: CreditCard, title: "Cadastro de Cobranças", desc: "Crie e gerencie cobranças com parcelas", colors: "from-indigo-50 to-indigo-100 border-indigo-200", iconBg: "bg-indigo-500" },
                    { to: "/billing", icon: Calendar, title: "Cobranças Pendentes", desc: "Visualize pagamentos pendentes", colors: "from-orange-50 to-orange-100 border-orange-200", iconBg: "bg-orange-500" },
                    { to: "/reports", icon: TrendingUp, title: "Relatórios", desc: "Análise e métricas de desempenho", colors: "from-purple-50 to-purple-100 border-purple-200", iconBg: "bg-purple-500" },
                  ].map((item, i) => (
                    <Link key={i} to={item.to} className="group">
                      <div className={`p-4 md:p-6 bg-gradient-to-br ${item.colors} rounded-xl border hover:shadow-lg transition-all duration-300 group-hover:scale-105`}>
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 ${item.iconBg} rounded-lg`}><item.icon className="w-6 h-6 text-white" /></div>
                          <div><h3 className="font-semibold text-gray-900">{item.title}</h3><p className="text-sm text-gray-600">{item.desc}</p></div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="shadow-lg border-0">
              <CardHeader><CardTitle className="text-xl">Atividades Recentes</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center py-8"><Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">Nenhuma atividade recente</p></div>
              </CardContent>
            </Card>
            <Card className="shadow-lg border-0 mt-6">
              <CardHeader><CardTitle className="text-xl">Resumo Rápido</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-gray-600">Taxa de Pagamento</span><span className="font-semibold text-gray-500">0%</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-600">Tempo Médio de Cobrança</span><span className="font-semibold text-gray-500">0 dias</span></div>
                </div>
                <Link to="/reports"><Button className="w-full mt-4 bg-gradient-to-r from-gray-600 to-gray-700">Ver Relatórios Completos</Button></Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;