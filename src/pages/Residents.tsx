import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { useAuth } from '@/hooks/useAuth';
import { Resident } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, User, Phone, Home, Loader2, Trash2, Pencil, FileSpreadsheet } from 'lucide-react';
import ImportResidentsDialog from '@/components/residents/ImportResidentsDialog';

export default function Residents() {
  const { condominium } = useCondominium();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const groupLabel = condominium?.group_label || 'Bloco';
  const unitLabel = condominium?.unit_label || 'Apartamento';

  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();
  const isSuperadmin = role === 'superadmin';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [block, setBlock] = useState('');
  const [apartment, setApartment] = useState('');

  useEffect(() => { fetchResidents(); }, [condominium?.id]);

  const fetchResidents = async () => {
    if (!condominium?.id) {
      setResidents([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('residents')
      .select('*')
      .eq('condominium_id', condominium.id)
      .is('deleted_at', null)
      .order('full_name');

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

  const sanitizePhone = (raw: string): string => {
    let digits = raw.replace(/[^\d]/g, "");
    if (digits.startsWith("55") && digits.length >= 12) {
      return `+${digits}`;
    } else if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    return `+${digits}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const sanitizedPhone = sanitizePhone(phone);
    try {
      if (editingResident) {
        const { error } = await supabase.from('residents').update({ full_name: fullName, phone: sanitizedPhone, block, apartment }).eq('id', editingResident.id);
        if (error) throw error;
        toast({ title: 'Morador atualizado!' });
      } else {
        const { error } = await supabase.from('residents').insert({ full_name: fullName, phone: sanitizedPhone, block, apartment, condominium_id: condominium?.id || null });
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

  const handleDelete = async (resident: Resident) => {
    const { error } = await supabase.from('residents').update({ deleted_at: new Date().toISOString() } as any).eq('id', resident.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: 'Tente novamente', variant: 'destructive' });
    } else {
      toast({ title: 'Morador removido!' });
      fetchResidents();
    }
    setDeleteTarget(null);
  };

  const handleToggleWhatsApp = async (resident: Resident) => {
    const newValue = !resident.whatsapp_enabled;
    const { error } = await supabase
      .from('residents')
      .update({ whatsapp_enabled: newValue })
      .eq('id', resident.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      return;
    }

    setResidents((prev) =>
      prev.map((r) => r.id === resident.id ? { ...r, whatsapp_enabled: newValue } : r)
    );
    toast({ title: newValue ? 'Notificações ativadas' : 'Notificações desativadas' });
  };

  const filteredResidents = residents.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.block.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.apartment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Moradores</h1>
        <div className="flex items-center gap-2">
          {isSuperadmin && condominium?.id && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importar planilha
            </Button>
          )}
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
                  <Label htmlFor="block">{groupLabel}</Label>
                  <Input id="block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apartment">{unitLabel}</Label>
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
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate max-w-[150px] sm:max-w-none">{resident.full_name}</p>
                      {!resident.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Home className="w-3 h-3" />{resident.block}/{resident.apartment}</span>
                      <span className="flex items-center gap-1 truncate"><Phone className="w-3 h-3" />{resident.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {isAdmin && (
                      <Switch
                        checked={resident.whatsapp_enabled}
                        onCheckedChange={() => handleToggleWhatsApp(resident)}
                        aria-label="Notificações WhatsApp"
                      />
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(resident)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(resident)}><Trash2 className="w-4 h-4" /></Button>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {deleteTarget?.full_name}? Esta ação pode ser desfeita pelo suporte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isSuperadmin && condominium?.id && (
        <ImportResidentsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          condominiumId={condominium.id}
          groupLabel={groupLabel}
          unitLabel={unitLabel}
          onImportComplete={fetchResidents}
        />
      )}
    </div>
  );
}
