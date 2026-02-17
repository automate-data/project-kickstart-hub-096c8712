import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft } from "lucide-react";
import { useCobrancasLixeira } from "@/hooks/useCobrancasLixeira";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cobrancasAPI, type Cobranca } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CobrancasLixeira = () => {
  const navigate = useNavigate();
  const { data: cobrancas = [] } = useCobrancasLixeira();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getDiasRestantes = (excluidoEm: string) => { const d = new Date(excluidoEm); const h = new Date(); const dp = Math.floor((h.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)); const dr = 7 - dp; return dr > 0 ? dr : 0; };

  const restoreCobranca = useMutation({ mutationFn: (id: string) => cobrancasAPI.restore(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cobrancas-lixeira'] }); queryClient.invalidateQueries({ queryKey: ['cobrancas'] }); toast({ title: "Cobrança restaurada!" }); }, onError: (error: Error) => { toast({ title: "Erro", description: error.message, variant: "destructive" }); } });
  const deleteCobrancaPermanentemente = useMutation({ mutationFn: (id: string) => cobrancasAPI.deletePermanently(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cobrancas-lixeira'] }); toast({ title: "Cobrança excluída permanentemente!" }); setDeleteConfirmId(null); }, onError: (error: Error) => { toast({ title: "Erro", description: error.message, variant: "destructive" }); setDeleteConfirmId(null); } });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/cobrancas')} className="mr-2"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center"><Trash2 className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold text-gray-800">Lixeira de Cobranças</span>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8"><div><h1 className="text-3xl font-bold text-gray-900 mb-2">Cobranças Excluídas</h1><p className="text-gray-600">As cobranças serão excluídas permanentemente após 7 dias</p></div></div>
        <Card className="border-0 shadow-lg bg-orange-50 border-orange-200 mb-6"><CardContent className="p-6"><div className="flex items-start gap-4"><AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" /><div><h3 className="font-semibold text-orange-900 mb-1">Atenção</h3><p className="text-orange-800 text-sm">As cobranças aqui listadas serão excluídas permanentemente após 7 dias da data de exclusão.</p></div></div></CardContent></Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cobranças na Lixeira</p><p className="text-3xl font-bold text-orange-600">{cobrancas.length}</p></div><Trash2 className="w-10 h-10 text-orange-600" /></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Valor Total</p><p className="text-2xl font-bold text-gray-700">R$ {cobrancas.reduce((acc, c) => acc + Number(c.valor), 0).toFixed(2)}</p></div></div></CardContent></Card>
        </div>
        <Card className="border-0 shadow-lg">
          <CardHeader><CardTitle>Cobranças Excluídas</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Título</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Excluída em</TableHead><TableHead>Dias Restantes</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {cobrancas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">A lixeira está vazia.</TableCell></TableRow>
                ) : cobrancas.map((cobranca) => {
                  const diasRestantes = getDiasRestantes(cobranca.excluido_em || '');
                  return (
                    <TableRow key={cobranca.id}>
                      <TableCell className="font-medium">{typeof cobranca.clientes === 'object' && cobranca.clientes ? cobranca.clientes.nome : 'Cliente'}</TableCell>
                      <TableCell>{cobranca.titulo}</TableCell>
                      <TableCell>R$ {Number(cobranca.valor).toFixed(2)}</TableCell>
                      <TableCell>{new Date(cobranca.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{cobranca.excluido_em ? new Date(cobranca.excluido_em).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell><Badge variant={diasRestantes <= 2 ? "destructive" : "outline"} className={diasRestantes <= 2 ? "" : "border-orange-500 text-orange-700"}>{diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}</Badge></TableCell>
                      <TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => restoreCobranca.mutate(cobranca.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50"><RotateCcw className="w-4 h-4 mr-1" />Restaurar</Button><Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(cobranca.id)}><Trash2 className="w-4 h-4 mr-1" />Excluir</Button></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirmId && deleteCobrancaPermanentemente.mutate(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir Permanentemente</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CobrancasLixeira;
