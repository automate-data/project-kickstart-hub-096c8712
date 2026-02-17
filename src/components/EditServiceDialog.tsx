
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useUpdateServico } from "@/hooks/useServicos";

interface EditServiceDialogProps { service: any; open: boolean; onOpenChange: (open: boolean) => void; }

const EditServiceDialog = ({ service, open, onOpenChange }: EditServiceDialogProps) => {
  const [formData, setFormData] = useState({ nome: "", descricao: "", valor: "", categoria: "", ativo: true });
  const updateServico = useUpdateServico();

  useEffect(() => { if (service) setFormData({ nome: service.nome || "", descricao: service.descricao || "", valor: service.valor?.toString() || "", categoria: service.categoria || "", ativo: service.ativo !== false }); }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.valor) return;
    try { await updateServico.mutateAsync({ id: service.id, data: { nome: formData.nome, descricao: formData.descricao || null, valor: parseFloat(formData.valor), categoria: formData.categoria || null, ativo: formData.ativo } }); onOpenChange(false); } catch (error) { console.error('Erro ao atualizar serviço:', error); }
  };

  const handleChange = (field: string, value: string | boolean) => { setFormData(prev => ({ ...prev, [field]: value })); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Editar Serviço</DialogTitle><DialogDescription>Atualize as informações do serviço.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="nome">Nome do Serviço *</Label><Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" value={formData.descricao} onChange={(e) => handleChange("descricao", e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="valor">Valor *</Label><Input id="valor" type="number" step="0.01" value={formData.valor} onChange={(e) => handleChange("valor", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="categoria">Categoria</Label><Input id="categoria" value={formData.categoria} onChange={(e) => handleChange("categoria", e.target.value)} /></div>
          </div>
          <div className="flex items-center space-x-2"><Switch id="ativo" checked={formData.ativo} onCheckedChange={(checked) => handleChange("ativo", checked)} /><Label htmlFor="ativo">Serviço ativo</Label></div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={updateServico.isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700" disabled={updateServico.isPending}>{updateServico.isPending ? "Atualizando..." : "Atualizar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceDialog;
