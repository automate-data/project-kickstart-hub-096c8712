import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, Location } from '@/types';
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserCog, Loader2, Trash2, Pencil, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface StaffMember extends Profile {
  role?: AppRole;
  role_id?: string;
  location_id?: string | null;
  tower_name?: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { toast } = useToast();
  const { condominium } = useCondominium();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [rg, setRg] = useState('');
  const [role, setRole] = useState<AppRole>('doorman');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [towers, setTowers] = useState<Location[]>([]);
  const [tempPassword, setTempPassword] = useState('');

  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRg, setEditRg] = useState('');
  const [editRole, setEditRole] = useState<AppRole>('doorman');

  useEffect(() => { fetchStaff(); fetchTowers(); }, [condominium?.id]);

  const fetchTowers = async () => {
    if (!condominium) { setTowers([]); return; }
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('condominium_id', condominium.id)
      .eq('type', 'tower');
    setTowers((data as unknown as Location[]) || []);
  };

  const fetchStaff = async () => {
    if (!condominium) {
      setStaff([]);
      setIsLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*')
      .eq('condominium_id', condominium.id)
      .is('deleted_at', null);

    if (rolesData && rolesData.length > 0) {
      const userIds = rolesData.map(r => r.user_id);
      const locationIds = rolesData.map(r => (r as any).location_id).filter(Boolean);

      const [{ data: profilesData }, locationsResult] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        locationIds.length > 0
          ? supabase.from('locations').select('*').in('id', locationIds)
          : Promise.resolve({ data: [] }),
      ]);

      const locationsMap = new Map((locationsResult.data || []).map((l: any) => [l.id, l.name]));

      if (profilesData) {
        const staffWithRoles = profilesData.map(profile => {
          const roleEntry = rolesData.find(r => r.user_id === profile.id);
          const locId = (roleEntry as any)?.location_id;
          return {
            ...profile,
            role: roleEntry?.role as AppRole,
            role_id: roleEntry?.id,
            location_id: locId || null,
            tower_name: locId ? (locationsMap.get(locId) || '') : undefined,
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
        body: { role, full_name: fullName, username, rg, condominium_id: condominium?.id, location_id: role === 'tower_doorman' ? locationId : null },
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

      if (data?.temp_password) {
        setTempPassword(data.temp_password);
        toast({ title: 'Membro adicionado!', description: `Senha temporária: ${data.temp_password}` });
      } else {
        toast({ title: 'Membro adicionado!', description: 'Usuário já existente foi vinculado ao condomínio.' });
      }
      setDialogOpen(false);
      setFullName('');
      setUsername('');
      setRg('');
      setRole('doorman');
      setLocationId(null);
      fetchStaff();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao adicionar', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStaff = async (member: StaffMember) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('user_id', member.id)
      .eq('condominium_id', condominium?.id || '');
    if (error) {
      toast({ title: 'Erro ao remover', description: 'Tente novamente', variant: 'destructive' });
    } else {
      toast({ title: 'Membro removido!' });
      fetchStaff();
    }
    setDeleteTarget(null);
  };

  const handleEditStaff = (member: StaffMember) => {
    setEditingMember(member);
    setEditFullName(member.full_name || '');
    setEditEmail(member.email || '');
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    if (newPassword.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Mínimo de 6 caracteres.', variant: 'destructive' });
      return;
    }
    setIsResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { target_user_id: passwordTarget.id, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Senha alterada!', description: `Senha de ${passwordTarget.full_name} foi redefinida.` });
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Erro ao redefinir senha', description: err?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const filteredStaff = staff.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.rg || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'admin': return <Badge variant="default">Administrador</Badge>;
      case 'doorman': return <Badge variant="secondary">Porteiro</Badge>;
      case 'tower_doorman': return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">Porteiro de Torre</Badge>;
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
                <Label htmlFor="username">Usuário</Label>
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nome.usuario" required />
                <p className="text-xs text-muted-foreground">Será usado para login (sem espaços ou caracteres especiais)</p>
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
                    <p className="text-sm text-muted-foreground truncate">Usuário: {member.email?.replace('@cond.internal', '') || '—'}</p>
                    <p className="text-sm text-muted-foreground truncate">RG: {member.rg || '—'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditStaff(member)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setPasswordTarget(member); setNewPassword(''); }} title="Redefinir senha">
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(member)} className="text-destructive hover:text-destructive" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {staff.length} membro{staff.length !== 1 ? 's' : ''} na equipe
        </p>
        {user && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const me = staff.find(s => s.id === user.id);
              setPasswordTarget(me || { id: user.id, full_name: 'Você', email: user.email || '', rg: null, created_at: '', updated_at: '' });
              setNewPassword('');
            }}
          >
            <KeyRound className="w-4 h-4" />
            Alterar minha senha
          </Button>
        )}
      </div>
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
              <Label htmlFor="editUsername">Usuário</Label>
              <Input id="editUsername" type="text" value={editEmail?.replace('@cond.internal', '') || ''} disabled className="bg-muted" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {deleteTarget?.full_name} da equipe? O acesso será revogado imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleRemoveStaff(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!passwordTarget} onOpenChange={(open) => { if (!open) { setPasswordTarget(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {passwordTarget?.full_name}. O usuário será obrigado a alterar na próxima entrada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isResettingPassword}>
              {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redefinir senha'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
