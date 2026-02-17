import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types';
import { useCondominium } from '@/hooks/useCondominium';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserCog, Loader2, Trash2, Pencil } from 'lucide-react';

interface StaffMember extends Profile {
  role?: AppRole;
  role_id?: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { condominium } = useCondominium();

  const [fullName, setFullName] = useState('');
  const [rg, setRg] = useState('');
  const [role, setRole] = useState<AppRole>('doorman');

  const [editFullName, setEditFullName] = useState('');
  const [editRg, setEditRg] = useState('');
  const [editRole, setEditRole] = useState<AppRole>('doorman');

  useEffect(() => { fetchStaff(); }, [condominium?.id]);

  const fetchStaff = async () => {
    if (!condominium) {
      setStaff([]);
      setIsLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*')
      .eq('condominium_id', condominium.id);

    if (rolesData && rolesData.length > 0) {
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds);

      if (profilesData) {
        const staffWithRoles = profilesData.map(profile => {
          const roleEntry = rolesData.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: roleEntry?.role as AppRole,
            role_id: roleEntry?.id,
          };
        });
        setStaff(staffWithRoles);
      }
    } else {
      setStaff([]);
    }
    setIsLoading(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: { role, full_name: fullName, rg, condominium_id: condominium?.id },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === 'User already has a role') {
          toast({ title: 'Usuário já é membro da equipe', description: 'Este usuário já tem um papel atribuído', variant: 'destructive' });
        } else {
          toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        }
        setIsSaving(false);
        return;
      }

      toast({ title: 'Membro adicionado!', description: 'O usuário foi adicionado à equipe.' });
      setDialogOpen(false);
      setFullName('');
      setRg('');
      setRole('doorman');
      fetchStaff();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao adicionar', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStaff = async (member: StaffMember) => {
    if (!confirm('Deseja realmente remover este membro da equipe?')) return;
    // Delete only the role for this condominium, not all roles
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', member.id)
      .eq('condominium_id', condominium?.id || '');
    if (error) {
      toast({ title: 'Erro ao remover', description: 'Tente novamente', variant: 'destructive' });
    } else {
      toast({ title: 'Membro removido!' });
      fetchStaff();
    }
  };

  const handleEditStaff = (member: StaffMember) => {
    setEditingMember(member);
    setEditFullName(member.full_name || '');
    setEditRg(member.rg || '');
    setEditRole(member.role || 'doorman');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSaving(true);
    try {
      // Update profile name and rg
      if (editFullName !== editingMember.full_name || editRg !== (editingMember.rg || '')) {
        const updateData: any = {};
        if (editFullName !== editingMember.full_name) updateData.full_name = editFullName;
        if (editRg !== (editingMember.rg || '')) updateData.rg = editRg;
        const { error: profileError } = await supabase.from('profiles').update(updateData).eq('id', editingMember.id);
        if (profileError) throw profileError;
      }
      // Update role if changed
      if (editRole !== editingMember.role) {
        const { error: roleError } = await supabase.from('user_roles').update({ role: editRole }).eq('user_id', editingMember.id).eq('condominium_id', condominium?.id || '');
        if (roleError) throw roleError;
      }
      toast({ title: 'Membro atualizado!' });
      setEditDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Edit staff error:', error, JSON.stringify(error));
      toast({ title: 'Erro ao atualizar', description: error?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staff.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.rg || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'admin': return <Badge variant="default">Administrador</Badge>;
      case 'doorman': return <Badge variant="secondary">Porteiro</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar membro</DialogTitle>
              <DialogDescription>Informe os dados do novo membro da equipe.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" type="text" value={rg} onChange={(e) => setRg(e.target.value)} placeholder="Número do RG" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doorman">Porteiro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar membro'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar membro..." className="pl-10" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="flex gap-4"><div className="w-12 h-12 bg-muted rounded-full" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div></CardContent></Card>
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">{searchQuery ? 'Nenhum membro encontrado' : 'Nenhum membro na equipe'}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCog className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.full_name}</p>
                      {member.role && getRoleBadge(member.role)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">RG: {member.rg || '—'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditStaff(member)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStaff(member)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        {staff.length} membro{staff.length !== 1 ? 's' : ''} na equipe
      </p>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar membro</DialogTitle>
            <DialogDescription>Altere o nome ou papel do membro</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nome completo</Label>
              <Input id="editFullName" type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRg">RG</Label>
              <Input id="editRg" type="text" value={editRg} onChange={(e) => setEditRg(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Papel</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doorman">Porteiro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
