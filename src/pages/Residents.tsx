import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resident } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, User, Phone, Home, Loader2, Trash2, Pencil } from 'lucide-react';

export default function Residents() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [block, setBlock] = useState('');
  const [apartment, setApartment] = useState('');

  useEffect(() => { fetchResidents(); }, []);

  const fetchResidents = async () => {
    const { data } = await supabase.from('residents').select('*').order('full_name');
    if (data) setResidents(data as Resident[]);
    setIsLoading(false);
  };

  const resetForm = () => { setFullName(''); setPhone(''); setBlock(''); setApartment(''); setEditingResident(null); };

  const openEditDialog = (resident: Resident) => {
    setEditingResident(resident);
    setFullName(resident.full_name);
    setPhone(resident.phone);
    setBlock(resident.block);
    setApartment(resident.apartment);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingResident) {
        const { error } = await supabase.from('residents').update({ full_name: fullName, phone, block, apartment }).eq('id', editingResident.id);
        if (error) throw error;
        toast({ title: 'Morador atualizado!' });
      } else {
        const { error } = await supabase.from('residents').insert({ full_name: fullName, phone, block, apartment });
        if (error) throw error;
        toast({ title: 'Morador cadastrado!' });
      }
      setDialogOpen(false);
      resetForm();
      fetchResidents();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este morador?')) return;
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: 'Tente novamente', variant: 'destructive' });
    } else {
      toast({ title: 'Morador excluído!' });
      fetchResidents();
    }
  };

  const filteredResidents = residents.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.block.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.apartment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moradores</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingResident ? 'Editar morador' : 'Novo morador'}</DialogTitle>
              <DialogDescription>Preencha os dados do morador</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="block">Bloco</Label>
                  <Input id="block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apartment">Apartamento</Label>
                  <Input id="apartment" value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder="101" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingResident ? 'Salvar alterações' : 'Cadastrar morador'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar morador..." className="pl-10" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="flex gap-4"><div className="w-12 h-12 bg-muted rounded-full" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div></CardContent></Card>
          ))}
        </div>
      ) : filteredResidents.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><User className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">{searchQuery ? 'Nenhum morador encontrado' : 'Nenhum morador cadastrado'}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredResidents.map((resident) => (
            <Card key={resident.id} className={!resident.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{resident.full_name}</p>
                      {!resident.is_active && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Home className="w-3 h-3" />{resident.block}/{resident.apartment}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{resident.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(resident)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(resident.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        {residents.length} morador{residents.length !== 1 ? 'es' : ''} cadastrado{residents.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
