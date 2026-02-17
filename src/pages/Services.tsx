import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Edit, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import ServiceDialog from "@/components/ServiceDialog";
import EditServiceDialog from "@/components/EditServiceDialog";
import { useServicos, useDeleteServico } from "@/hooks/useServicos";

const Services = () => {
  const { data: servicos = [], isLoading } = useServicos();
  const deleteServico = useDeleteServico();
  const [editingService, setEditingService] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditService = (service: any) => { setEditingService(service); setEditDialogOpen(true); };
  const handleDeleteService = async (id: string) => { if (confirm("Tem certeza que deseja excluir este serviço?")) { await deleteServico.mutateAsync(id); } };

  const totalRevenue = servicos.reduce((sum, s) => sum + Number(s.valor), 0);
  const activeServices = servicos.filter(s => s.ativo).length;
  const categoriesCount = new Set(servicos.filter(s => s.categoria).map(s => s.categoria)).size;

  if (isLoading) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Carregando serviços...</p></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <BackToDashboardButton />
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">Serviços</span>
          </div>
          <ServiceDialog />
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8"><div><h1 className="text-3xl font-bold text-gray-900 mb-2">Serviços</h1><p className="text-gray-600">Gerencie seus serviços oferecidos</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Valor Total</p><p className="text-3xl font-bold text-gray-900">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div><MessageSquare className="w-8 h-8 text-green-600" /></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Serviços Ativos</p><p className="text-3xl font-bold text-gray-900">{activeServices}</p></div><MessageSquare className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Categorias</p><p className="text-3xl font-bold text-gray-900">{categoriesCount}</p></div><MessageSquare className="w-8 h-8 text-purple-600" /></div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Lista de Serviços</CardTitle><CardDescription>Todos os seus serviços cadastrados</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            {servicos.length === 0 ? (
              <div className="text-center py-8"><MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 mb-2">Nenhum serviço cadastrado ainda</p><p className="text-sm text-gray-500">Clique em "Novo Serviço" para começar</p></div>
            ) : (
              <Table className="min-w-[600px]">
                <TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {servicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell><div><div className="font-medium">{servico.nome}</div>{servico.descricao && <div className="text-sm text-gray-500">{servico.descricao}</div>}</div></TableCell>
                      <TableCell>{servico.categoria || '-'}</TableCell>
                      <TableCell>R$ {Number(servico.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge className={servico.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{servico.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditService(servico)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteService(servico.id)} className="text-destructive" disabled={deleteServico.isPending}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <EditServiceDialog service={editingService} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
    </div>
  );
};

export default Services;
