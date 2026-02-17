
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Calendar, AlertCircle } from "lucide-react";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useToast } from "@/hooks/use-toast";

const Billing = () => {
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendReminder = async (billId: number) => {
    setIsLoading(true);
    const bill = pendingBills.find(b => b.id === billId);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPendingBills(prev => prev.map(b => b.id === billId ? { ...b, lastContact: new Date().toLocaleDateString('pt-BR') } : b));
      toast({ title: "Lembrete enviado!", description: `Mensagem de cobrança enviada para ${bill?.client}` });
    } catch (error) {
      toast({ title: "Erro ao enviar", description: "Não foi possível enviar a mensagem de cobrança.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleBulkReminder = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const today = new Date().toLocaleDateString('pt-BR');
      setPendingBills(prev => prev.map(bill => ({ ...bill, lastContact: today })));
      toast({ title: "Cobranças enviadas!", description: `${pendingBills.length} mensagens de cobrança foram enviadas em lote.` });
    } catch (error) {
      toast({ title: "Erro no envio em lote", description: "Não foi possível enviar as mensagens de cobrança.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case "Vencida": return "bg-red-100 text-red-800"; case "A Vencer": return "bg-yellow-100 text-yellow-800"; default: return "bg-gray-100 text-gray-800"; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3"><BackToDashboardButton /><span className="text-lg md:text-xl font-bold text-gray-800">Cobranças Pendentes</span></div>
          <Button className="bg-green-600 hover:bg-green-700 text-sm md:text-base" onClick={handleBulkReminder} disabled={isLoading}>
            <MessageSquare className="w-4 h-4 mr-2" /><span className="hidden sm:inline">{isLoading ? "Enviando..." : "Enviar Cobrança em Lote"}</span><span className="sm:hidden">{isLoading ? "..." : "Enviar"}</span>
          </Button>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Cobranças Vencidas</p><p className="text-3xl font-bold text-red-600">0</p><p className="text-sm text-red-600">R$ 0,00</p></div><AlertCircle className="w-8 h-8 text-red-600" /></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">A Vencer (7 dias)</p><p className="text-3xl font-bold text-yellow-600">0</p><p className="text-sm text-yellow-600">R$ 0,00</p></div><Calendar className="w-8 h-8 text-yellow-600" /></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Mensagens Enviadas Hoje</p><p className="text-3xl font-bold text-blue-600">0</p><p className="text-sm text-blue-600">0 respostas</p></div><MessageSquare className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Cobranças Pendentes</CardTitle><CardDescription>Acompanhe todas as cobranças em aberto e seus status</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Dias em Atraso</TableHead><TableHead>Último Contato</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingBills.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12"><div className="flex flex-col items-center"><AlertCircle className="w-16 h-16 text-gray-300 mb-4" /><p className="text-gray-500">Nenhuma cobrança pendente</p><p className="text-sm text-gray-400 mt-2">As cobranças em aberto aparecerão aqui</p></div></TableCell></TableRow>
                ) : (
                  pendingBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.client}</TableCell><TableCell>{bill.service}</TableCell><TableCell>{bill.value}</TableCell><TableCell>{bill.dueDate}</TableCell>
                      <TableCell>{bill.daysOverdue > 0 ? <span className="text-red-600 font-medium">{bill.daysOverdue} dias</span> : <span className="text-gray-500">-</span>}</TableCell>
                      <TableCell>{bill.lastContact}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>{bill.status}</span></TableCell>
                      <TableCell><Button variant="outline" size="sm" onClick={() => handleSendReminder(bill.id)} disabled={isLoading}><MessageSquare className="w-3 h-3 mr-1" />{isLoading ? "..." : "Cobrar"}</Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
