
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateCliente } from "@/hooks/useClientes";
import type { Cliente } from "@/lib/supabase-client";

interface EditClientDialogProps { client: Cliente | null; open: boolean; onOpenChange: (open: boolean) => void; }

const EditClientDialog = ({ client, open, onOpenChange }: EditClientDialogProps) => {
  const [formData, setFormData] = useState({ nome: "", email: "", telefone: "", empresa: "", endereco: "", cidade: "", estado: "", cep: "", observacoes: "" });
  const updateCliente = useUpdateCliente();

  useEffect(() => { if (client) setFormData({ nome: client.nome || "", email: client.email || "", telefone: client.telefone || "", empresa: client.empresa || "", endereco: client.endereco || "", cidade: client.cidade || "", estado: client.estado || "", cep: client.cep || "", observacoes: client.observacoes || "" }); }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !formData.nome || !formData.email) return;
    try { await updateCliente.mutateAsync({ id: client.id, data: formData }); onOpenChange(false); } catch (error) { console.error('Erro ao atualizar cliente:', error); }
  };

  const handleChange = (field: string, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Editar Cliente</DialogTitle><DialogDescription>Atualize as informações do cliente.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="nome">Nome completo *</Label><Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="empresa">Empresa</Label><Input id="empresa" value={formData.empresa} onChange={(e) => handleChange("empresa", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" value={formData.endereco} onChange={(e) => handleChange("endereco", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="cidade">Cidade</Label><Input id="cidade" value={formData.cidade} onChange={(e) => handleChange("cidade", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="estado">Estado</Label><Input id="estado" value={formData.estado} onChange={(e) => handleChange("estado", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="cep">CEP</Label><Input id="cep" value={formData.cep} onChange={(e) => handleChange("cep", e.target.value)} /></div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={updateCliente.isPending}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700" disabled={updateCliente.isPending}>{updateCliente.isPending ? "Atualizando..." : "Atualizar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
