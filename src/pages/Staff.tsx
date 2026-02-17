import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types';
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
import { Plus, Search, UserCog, Loader2, Trash2 } from 'lucide-react';

interface StaffMember extends Profile {
  role?: AppRole;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('doorman');

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    const { data: rolesData } = await supabase.from('user_roles').select('*');

    if (rolesData && rolesData.length > 0) {
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds);

      if (profilesData) {
        const staffWithRoles = profilesData.map(profile => ({
          ...profile,
          role: rolesData.find(r => r.user_id === profile.id)?.role as AppRole,
        }));
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
      const { data: profileData } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();

      if (!profileData) {
        toast({ title: 'Usuário não encontrado', description: 'O email informado não está cadastrado no sistema', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', profileData.id).maybeSingle();

      if (existingRole) {
        toast({ title: 'Usuário já é membro da equipe', description: 'Este usuário já tem um papel atribuído', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from('user_roles').insert({ user_id: profileData.id, role });

      if (error) throw error;

      toast({ title: 'Membro adicionado!' });
      setDialogOpen(false);
      setEmail('');
      setRole('doorman');
      fetchStaff();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao adicionar', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!confirm('Deseja realmente remover este membro da equipe?')) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (error) {
      toast({ title: 'Erro ao remover', description: 'Tente novamente', variant: 'destructive' });
    } else {
      toast({ title: 'Membro removido!' });
      fetchStaff();
    }
  };

  const filteredStaff = staff.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
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
              <DialogDescription>Informe o email de um usuário já cadastrado</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do usuário</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" required />
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
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveStaff(member.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        {staff.length} membro{staff.length !== 1 ? 's' : ''} na equipe
      </p>
    </div>
  );
}
