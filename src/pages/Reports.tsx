
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, TrendingUp, DollarSign, Calendar, Users, FileText, Download, AlertTriangle } from "lucide-react";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useReportsStats } from "@/hooks/useReportsStats";

const Reports = () => {
  const { data: reportData, isLoading, error } = useReportsStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <BackToDashboardButton />
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">Relatórios</span>
          </div>
          <div className="flex gap-2"><Button variant="outline" size="sm"><Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Exportar</span></Button></div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1><p className="text-gray-600">Análise completa do desempenho das suas cobranças</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {isLoading ? (
            [1,2,3,4].map(i => <Card key={i}><CardContent className="p-6"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-20" /></div><Skeleton className="w-8 h-8 rounded" /></div></CardContent></Card>)
          ) : error ? (
            <div className="col-span-4 text-center p-8"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" /><p className="text-red-600 font-medium">Erro ao carregar relatórios</p><p className="text-gray-500 text-sm mt-1">Tente recarregar a página</p></div>
          ) : (
            <>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Receita Total</p><p className="text-3xl font-bold text-gray-900">R$ {reportData?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><DollarSign className="w-8 h-8 text-green-600" /></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Valor Pendente</p><p className="text-3xl font-bold text-gray-900">R$ {reportData?.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><Calendar className="w-8 h-8 text-orange-600" /></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Taxa de Conversão</p><p className="text-3xl font-bold text-gray-900">{reportData?.conversionRate}%</p></div><TrendingUp className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Mensagens Enviadas</p><p className="text-3xl font-bold text-gray-900">{reportData?.messagesSent}</p></div><MessageSquare className="w-8 h-8 text-purple-600" /></div></CardContent></Card>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card><CardHeader><CardTitle>Receita Mensal</CardTitle><CardDescription>Evolução da receita nos últimos 6 meses</CardDescription></CardHeader><CardContent><div className="flex items-center justify-center h-32"><p className="text-gray-500 text-center">Nenhum dado de receita disponível.<br />Adicione clientes e serviços para visualizar os relatórios.</p></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Mensagens por Mês</CardTitle><CardDescription>Volume de mensagens enviadas mensalmente</CardDescription></CardHeader><CardContent><div className="flex items-center justify-center h-32"><p className="text-gray-500 text-center">Nenhuma mensagem enviada ainda.<br />Configure o chatbot para começar a gerar relatórios.</p></div></CardContent></Card>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <Card><CardHeader><CardTitle className="flex items-center space-x-2"><Users className="w-5 h-5" /><span>Clientes</span></CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-600">Total de Clientes</span><span className="font-semibold">{isLoading ? <Skeleton className="h-5 w-8" /> : reportData?.totalClientes}</span></div><div className="flex justify-between"><span className="text-sm text-gray-600">Clientes Ativos</span><span className="font-semibold">0</span></div><div className="flex justify-between"><span className="text-sm text-gray-600">Novos este mês</span><span className="font-semibold">0</span></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center space-x-2"><FileText className="w-5 h-5" /><span>Serviços</span></CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-600">Serviços Concluídos</span><span className="font-semibold">{isLoading ? <Skeleton className="h-5 w-8" /> : reportData?.servicesCompleted}</span></div><div className="flex justify-between"><span className="text-sm text-gray-600">Em Andamento</span><span className="font-semibold">0</span></div><div className="flex justify-between"><span className="text-sm text-gray-600">Pendentes</span><span className="font-semibold">0</span></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center space-x-2"><DollarSign className="w-5 h-5" /><span>Financeiro</span></CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-600">Valor Recebido</span><span className="font-semibold text-green-600">{isLoading ? <Skeleton className="h-5 w-16" /> : `R$ ${reportData?.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span></div><div className="flex justify-between"><span className="text-sm text-gray-600">A Receber</span><span className="font-semibold text-orange-600">{isLoading ? <Skeleton className="h-5 w-16" /> : `R$ ${reportData?.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span></div><div className="flex justify-between"><span className="text-sm text-gray-600">Ticket Médio</span><span className="font-semibold">R$ 0,00</span></div></div></CardContent></Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
