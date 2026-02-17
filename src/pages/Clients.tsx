
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Edit, Trash2, Phone, Mail, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import ClientDialog from "@/components/ClientDialog";
import EditClientDialog from "@/components/EditClientDialog";
import { useClientes, useDeleteCliente } from "@/hooks/useClientes";

const Clients = () => {
  const { data: clientes = [], isLoading } = useClientes();
  const deleteCliente = useDeleteCliente();
  const [editingClient, setEditingClient] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditClient = (client: any) => { setEditingClient(client); setEditDialogOpen(true); };
  const handleDeleteClient = async (id: string) => { if (confirm("Tem certeza que deseja excluir este cliente?")) { await deleteCliente.mutateAsync(id); } };

  if (isLoading) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Carregando clientes...</p></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <BackToDashboardButton />
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><MessageSquare className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">Clientes</span>
          </div>
          <ClientDialog />
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8"><div><h1 className="text-3xl font-bold text-gray-900 mb-2">Clientes</h1><p className="text-gray-600">Gerencie sua base de clientes</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Total de Clientes</p><p className="text-3xl font-bold text-gray-900">{clientes.length}</p></div><MessageSquare className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Clientes Ativos</p><p className="text-3xl font-bold text-gray-900">{clientes.length}</p></div><Phone className="w-8 h-8 text-green-600" /></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Novos este Mês</p><p className="text-3xl font-bold text-gray-900">{clientes.filter(c => { const d = new Date(c.criado_em); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length}</p></div><Mail className="w-8 h-8 text-purple-600" /></div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Lista de Clientes</CardTitle><CardDescription>Todos os seus clientes cadastrados</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            {clientes.length === 0 ? (
              <div className="text-center py-8"><MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 mb-2">Nenhum cliente cadastrado ainda</p><p className="text-sm text-gray-500">Clique em "Novo Cliente" para começar</p></div>
            ) : (
              <Table className="min-w-[700px]">
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Empresa</TableHead><TableHead>Cidade</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.email}</TableCell>
                      <TableCell>{cliente.telefone || '-'}</TableCell>
                      <TableCell>{cliente.empresa || '-'}</TableCell>
                      <TableCell>{cliente.cidade || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClient(cliente)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClient(cliente.id)} className="text-destructive" disabled={deleteCliente.isPending}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
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
      <EditClientDialog client={editingClient} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
    </div>
  );
};

export default Clients;
