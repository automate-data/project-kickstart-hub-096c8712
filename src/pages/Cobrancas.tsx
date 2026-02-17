import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, DollarSign, Clock, CheckCircle, Edit, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CobrancaDialog from "@/components/CobrancaDialog";
import EditCobrancaDialog from "@/components/EditCobrancaDialog";
import { useCobrancas } from "@/hooks/useCobrancas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cobrancasAPI, type Cobranca } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

const Cobrancas = () => {
  const navigate = useNavigate();
  const { data: cobrancas = [] } = useCobrancas();
  const [editingCobranca, setEditingCobranca] = useState<Cobranca | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const totalPendente = cobrancas.filter(c => c.status === 'pendente').reduce((acc, c) => acc + Number(c.valor), 0);
  const totalPago = cobrancas.filter(c => c.status === 'pago').reduce((acc, c) => acc + Number(c.valor), 0);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", text: string }> = {
      pendente: { variant: "outline", text: "Pendente" }, pago: { variant: "default", text: "Pago" }, vencido: { variant: "destructive", text: "Vencido" }, cancelado: { variant: "secondary", text: "Cancelado" }
    };
    const config = variants[status] || variants.pendente;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const handleEdit = (cobranca: Cobranca) => { setEditingCobranca(cobranca); setEditDialogOpen(true); };

  const moveToTrashCobranca = useMutation({ mutationFn: (id: string) => cobrancasAPI.moveToTrash(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cobrancas'] }); toast({ title: "Cobrança movida para lixeira!" }); }, onError: (error: Error) => { toast({ title: "Erro", description: error.message, variant: "destructive" }); } });
  const bulkUpdateStatus = useMutation({ mutationFn: ({ ids, status }: { ids: string[], status: string }) => cobrancasAPI.updateMultipleStatus(ids, status), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cobrancas'] }); setSelectedIds([]); toast({ title: "Status atualizado!" }); }, onError: (error: Error) => { toast({ title: "Erro", description: error.message, variant: "destructive" }); } });
  const bulkMoveToTrash = useMutation({ mutationFn: (ids: string[]) => cobrancasAPI.moveMultipleToTrash(ids), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cobrancas'] }); setSelectedIds([]); setIsSelectionMode(false); toast({ title: "Cobranças movidas!" }); }, onError: (error: Error) => { toast({ title: "Erro", description: error.message, variant: "destructive" }); } });

  const handleDelete = (id: string) => { if (confirm("Deseja mover esta cobrança para a lixeira?")) moveToTrashCobranca.mutate(id); };
  const toggleSelection = (id: string) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
  const toggleSelectAll = () => { setSelectedIds(selectedIds.length === cobrancas.length ? [] : cobrancas.map(c => c.id)); };
  const handleBulkStatusChange = (status: string) => { bulkUpdateStatus.mutate({ ids: selectedIds, status }); };
  const handleBulkDelete = () => { if (confirm(`Deseja mover ${selectedIds.length} cobrança(s) para a lixeira?`)) bulkMoveToTrash.mutate(selectedIds); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3"><BackToDashboardButton /><div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div><span className="text-xl font-bold text-gray-800">Cobranças</span></div>
          <CobrancaDialog />
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8"><div><h1 className="text-3xl font-bold text-gray-900 mb-2">Cadastro de Cobranças</h1><p className="text-gray-600">Gerencie cobranças, parcelas e formas de pagamento</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total de Cobranças</p><p className="text-3xl font-bold">{cobrancas.length}</p></div><FileText className="w-10 h-10 text-blue-600" /></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-3xl font-bold text-orange-600">{cobrancas.filter(c => c.status === 'pendente').length}</p></div><Clock className="w-10 h-10 text-orange-600" /></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Valor Pendente</p><p className="text-2xl font-bold text-orange-600">R$ {totalPendente.toFixed(2)}</p></div><DollarSign className="w-10 h-10 text-orange-600" /></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Valor Recebido</p><p className="text-2xl font-bold text-green-600">R$ {totalPago.toFixed(2)}</p></div><CheckCircle className="w-10 h-10 text-green-600" /></div></CardContent></Card>
        </div>
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Lista de Cobranças</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/cobrancas/lixeira')}><Trash2 className="w-4 h-4 mr-2" />Lixeira</Button>
              <Button variant={isSelectionMode ? "default" : "outline"} size="sm" onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}><CheckCircle className="w-4 h-4 mr-2" />{isSelectionMode ? 'Cancelar' : 'Selecionar'}</Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader><TableRow>
                {isSelectionMode && <TableHead className="w-12"><Checkbox checked={selectedIds.length === cobrancas.length && cobrancas.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>}
                <TableHead>Cliente</TableHead><TableHead>Título</TableHead><TableHead>Valor</TableHead><TableHead>Parcelas</TableHead><TableHead>Vencimento</TableHead><TableHead>Forma de Pagamento</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cobrancas.length === 0 ? (
                  <TableRow><TableCell colSpan={isSelectionMode ? 9 : 8} className="text-center text-muted-foreground py-8">Nenhuma cobrança cadastrada. Clique em "Nova Cobrança" para começar.</TableCell></TableRow>
                ) : cobrancas.map((cobranca) => (
                  <TableRow key={cobranca.id}>
                    {isSelectionMode && <TableCell><Checkbox checked={selectedIds.includes(cobranca.id)} onCheckedChange={() => toggleSelection(cobranca.id)} /></TableCell>}
                    <TableCell className="font-medium">{typeof cobranca.clientes === 'object' && cobranca.clientes ? cobranca.clientes.nome : 'Cliente'}</TableCell>
                    <TableCell>{cobranca.titulo}</TableCell>
                    <TableCell>R$ {Number(cobranca.valor).toFixed(2)}</TableCell>
                    <TableCell>{cobranca.numero_parcelas > 1 ? <span>{cobranca.parcela_atual ? `${cobranca.parcela_atual}/` : ''}{cobranca.numero_parcelas}x</span> : 'À vista'}</TableCell>
                    <TableCell>{new Date(cobranca.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="capitalize">{cobranca.metodo_pagamento || '-'}</TableCell>
                    <TableCell>{getStatusBadge(cobranca.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleEdit(cobranca)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => handleDelete(cobranca.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Mover para Lixeira</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <EditCobrancaDialog cobranca={editingCobranca} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-lg p-4 flex items-center gap-4 border-2 border-primary z-50">
          <span className="font-medium">{selectedIds.length} {selectedIds.length === 1 ? 'cobrança selecionada' : 'cobranças selecionadas'}</span>
          <div className="flex gap-2">
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><CheckCircle className="w-4 h-4 mr-2" />Alterar Status</Button></DropdownMenuTrigger>
              <DropdownMenuContent><DropdownMenuItem onClick={() => handleBulkStatusChange('pendente')}>Marcar como Pendente</DropdownMenuItem><DropdownMenuItem onClick={() => handleBulkStatusChange('pago')}>Marcar como Pago</DropdownMenuItem><DropdownMenuItem onClick={() => handleBulkStatusChange('vencido')}>Marcar como Vencido</DropdownMenuItem><DropdownMenuItem onClick={() => handleBulkStatusChange('cancelado')}>Marcar como Cancelado</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="w-4 h-4 mr-2" />Mover para Lixeira</Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cobrancas;
