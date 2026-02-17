import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cobrancasAPI, type Cobranca } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

interface EditCobrancaDialogProps { cobranca: Cobranca | null; open: boolean; onOpenChange: (open: boolean) => void; }

const EditCobrancaDialog = ({ cobranca, open, onOpenChange }: EditCobrancaDialogProps) => {
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState(0);
  const [dataVencimento, setDataVencimento] = useState("");
  const [status, setStatus] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateCobranca = useMutation({ mutationFn: (data: any) => cobrancasAPI.update(cobranca?.id || '', data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cobrancas'] }); toast({ title: "Cobrança atualizada!" }); onOpenChange(false); }, onError: (error: Error) => { toast({ title: "Erro", description: error.message, variant: "destructive" }); } });

  useEffect(() => { if (cobranca) { setTitulo(cobranca.titulo); setValor(Number(cobranca.valor)); setDataVencimento(cobranca.data_vencimento); setStatus(cobranca.status); setMetodoPagamento(cobranca.metodo_pagamento || ""); setObservacoes(cobranca.observacoes || ""); } }, [cobranca]);

  const handleSubmit = () => {
    const updateData: any = { status, metodo_pagamento: metodoPagamento, observacoes };
    if (!cobranca || cobranca.numero_parcelas === 1) { updateData.titulo = titulo; updateData.valor = valor; updateData.data_vencimento = dataVencimento; }
    updateCobranca.mutate(updateData);
  };

  const isParcela = cobranca?.numero_parcelas ? cobranca.numero_parcelas > 1 : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Cobrança</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {cobranca && isParcela && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><h3 className="font-semibold text-blue-900 mb-2">Informações da Parcela</h3><div className="grid grid-cols-2 gap-2 text-sm"><div><span className="text-blue-700">Parcela:</span> <span className="font-medium">{cobranca.parcela_atual}/{cobranca.numero_parcelas}</span></div><div><span className="text-blue-700">Valor:</span> <span className="font-medium">R$ {Number(cobranca.valor).toFixed(2)}</span></div></div></div>
          )}
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={isParcela} className={isParcela ? "bg-gray-100 cursor-not-allowed" : ""} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Valor</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(parseFloat(e.target.value))} disabled={isParcela} className={isParcela ? "bg-gray-100 cursor-not-allowed" : ""} /></div>
            <div><Label>Data de Vencimento</Label><Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} disabled={isParcela} className={isParcela ? "bg-gray-100 cursor-not-allowed" : ""} /></div>
            <div><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div>
            <div><Label>Forma de Pagamento</Label><Select value={metodoPagamento} onValueChange={setMetodoPagamento}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="pix">Pix</SelectItem><SelectItem value="boleto">Boleto</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit}>Salvar Alterações</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCobrancaDialog;
