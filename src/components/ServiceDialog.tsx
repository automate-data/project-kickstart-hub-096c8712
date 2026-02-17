
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCreateServico } from "@/hooks/useServicos";
import { useAuth } from "@/hooks/useAuth";

const ServiceDialog = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", descricao: "", valor: "", categoria: "" });
  const createServico = useCreateServico();
  const { user, session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !session?.user) return;
    if (!formData.nome || !formData.valor) return;
    try {
      await createServico.mutateAsync({ nome: formData.nome, descricao: formData.descricao, valor: parseFloat(formData.valor), categoria: formData.categoria, ativo: true });
      setFormData({ nome: "", descricao: "", valor: "", categoria: "" }); setOpen(false);
    } catch (error) { console.error('Erro ao criar serviço:', error); }
  };

  const handleChange = (field: string, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-gradient-to-r from-blue-600 to-blue-700"><Plus className="w-4 h-4 mr-2" />Novo Serviço</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Cadastrar Novo Serviço</DialogTitle><DialogDescription>Registre um novo serviço para oferecer aos seus clientes.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="nome">Nome do Serviço *</Label><Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} placeholder="Ex: Desenvolvimento de site" required /></div>
          <div className="space-y-2"><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" value={formData.descricao} onChange={(e) => handleChange("descricao", e.target.value)} placeholder="Descrição detalhada do serviço" rows={3} /></div>
          <div className="space-y-2"><Label htmlFor="valor">Valor (R$) *</Label><Input id="valor" type="number" step="0.01" value={formData.valor} onChange={(e) => handleChange("valor", e.target.value)} placeholder="0.00" required /></div>
          <div className="space-y-2"><Label htmlFor="categoria">Categoria</Label><Input id="categoria" value={formData.categoria} onChange={(e) => handleChange("categoria", e.target.value)} placeholder="Ex: Desenvolvimento, Design, Consultoria" /></div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={createServico.isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700" disabled={createServico.isPending || (!user && !session?.user)}>{createServico.isPending ? "Cadastrando..." : "Cadastrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDialog;
