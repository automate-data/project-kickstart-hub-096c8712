
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { useCreateCliente } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ClientDialog = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", email: "", telefone: "", empresa: "", endereco: "", cidade: "", estado: "", cep: "", observacoes: "" });
  const createCliente = useCreateCliente();
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTriggerClick = () => {
    if (loading) return;
    if (!user && !session?.user) { toast({ title: "Login necessário", description: "Você precisa fazer login para cadastrar clientes.", variant: "destructive" }); navigate("/login"); return; }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) { toast({ title: "Campos obrigatórios", description: "Nome e email são obrigatórios.", variant: "destructive" }); return; }
    if (!user && !session?.user) { toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" }); navigate("/login"); return; }
    try {
      await createCliente.mutateAsync(formData);
      setFormData({ nome: "", email: "", telefone: "", empresa: "", endereco: "", cidade: "", estado: "", cep: "", observacoes: "" });
      setOpen(false);
    } catch (error) { toast({ title: "Erro no cadastro", description: "Ocorreu um erro ao cadastrar o cliente.", variant: "destructive" }); }
  };

  const handleChange = (field: string, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-gradient-to-r from-green-600 to-emerald-600" onClick={handleTriggerClick}><UserPlus className="w-4 h-4 mr-2" />Novo Cliente</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Cadastrar Novo Cliente</DialogTitle><DialogDescription>Preencha as informações do cliente.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="nome">Nome completo *</Label><Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} placeholder="Nome do cliente" required /></div>
          <div className="space-y-2"><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="cliente@email.com" required /></div>
          <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} placeholder="(11) 99999-9999" /></div>
          <div className="space-y-2"><Label htmlFor="empresa">Empresa</Label><Input id="empresa" value={formData.empresa} onChange={(e) => handleChange("empresa", e.target.value)} placeholder="Nome da empresa" /></div>
          <div className="space-y-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" value={formData.endereco} onChange={(e) => handleChange("endereco", e.target.value)} placeholder="Endereço completo" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="cidade">Cidade</Label><Input id="cidade" value={formData.cidade} onChange={(e) => handleChange("cidade", e.target.value)} placeholder="Cidade" /></div>
            <div className="space-y-2"><Label htmlFor="estado">Estado</Label><Input id="estado" value={formData.estado} onChange={(e) => handleChange("estado", e.target.value)} placeholder="UF" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="cep">CEP</Label><Input id="cep" value={formData.cep} onChange={(e) => handleChange("cep", e.target.value)} placeholder="00000-000" /></div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={createCliente.isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600" disabled={createCliente.isPending || loading || (!user && !session?.user)}>{createCliente.isPending ? "Cadastrando..." : "Cadastrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDialog;
