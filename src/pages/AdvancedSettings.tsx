import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import type { CustodyMode, Location, LocationType } from '@/types';

const TYPE_LABELS: Record<LocationType, string> = {
  central: 'Portaria Central',
  tower: 'Torre',
  locker: 'Armário',
};

const TYPE_COLORS: Record<LocationType, string> = {
  central: 'bg-blue-100 text-blue-800',
  tower: 'bg-green-100 text-green-800',
  locker: 'bg-amber-100 text-amber-800',
};

export default function AdvancedSettings() {
  const { condominium } = useCondominium();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [custodyMode, setCustodyMode] = useState<CustodyMode>('simple');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingMode, setLoadingMode] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<LocationType>('central');
  const [newParentId, setNewParentId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!condominium?.id) return;
    setLoadingMode(true);
    supabase
      .from('condominiums')
      .select('custody_mode')
      .eq('id', condominium.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setCustodyMode((data as any).custody_mode || 'simple');
        }
        setLoadingMode(false);
      });
  }, [condominium?.id]);

  useEffect(() => {
    if (!condominium?.id) return;
    if (custodyMode !== 'multi_custody' && custodyMode !== 'simple_locker') return;
    fetchLocations();
  }, [condominium?.id, custodyMode]);

  if (user?.email !== 'contato@automatedata.com.br') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Acesso não autorizado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          <Button onClick={() => navigate('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const fetchLocations = async () => {
    if (!condominium?.id) return;
    setLoadingLocations(true);
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('condominium_id', condominium.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setLocations(data as unknown as Location[]);
    }
    setLoadingLocations(false);
  };

  const handleCustodyModeChange = async (value: CustodyMode) => {
    if (!condominium?.id) return;
    const { error } = await supabase
      .from('condominiums')
      .update({ custody_mode: value } as any)
      .eq('id', condominium.id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a configuração.', variant: 'destructive' });
      return;
    }
    setCustodyMode(value);
    toast({ title: 'Configuração salva.' });

    // Garante portaria central pra simple_locker
    if (value === 'simple_locker') {
      const { data: existing } = await supabase
        .from('locations')
        .select('id')
        .eq('condominium_id', condominium.id)
        .eq('type', 'central')
        .limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from('locations').insert({
          condominium_id: condominium.id,
          type: 'central',
          name: 'Portaria',
        } as any);
      }
      await fetchLocations();
      // Default novo local: armário com parent = central
      setNewType('locker');
    }
  };

  const handleAddLocation = async () => {
    if (!condominium?.id || !newName.trim()) return;
    setSaving(true);
    const insert: any = {
      condominium_id: condominium.id,
      type: newType,
      name: newName.trim(),
      parent_id: newType === 'locker' && newParentId ? newParentId : null,
    };
    const { error } = await supabase.from('locations').insert(insert);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível adicionar o local.', variant: 'destructive' });
    } else {
      toast({ title: 'Local adicionado.' });
      setNewName('');
      setNewType('central');
      setNewParentId('');
      await fetchLocations();
    }
    setSaving(false);
  };

  const handleDeleteLocation = async (id: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir o local.', variant: 'destructive' });
    } else {
      toast({ title: 'Local excluído.' });
      await fetchLocations();
    }
  };

  const towers = locations.filter((l) => l.type === 'tower');
  const rootLocations = locations.filter((l) => !l.parent_id);
  const childLocations = (parentId: string) => locations.filter((l) => l.parent_id === parentId);

  if (loadingMode) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações Avançadas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modo de Operação</CardTitle>
          <CardDescription>
            Defina como este condomínio gerencia a custódia das encomendas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={custodyMode}
            onValueChange={(v) => handleCustodyModeChange(v as CustodyMode)}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="simple" id="mode-simple" className="mt-1" />
              <div>
                <Label htmlFor="mode-simple" className="font-medium cursor-pointer">
                  Portaria Simples
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Uma portaria central. Porteiro registra e morador retira diretamente.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="multi_custody" id="mode-multi" className="mt-1" />
              <div>
                <Label htmlFor="mode-multi" className="font-medium cursor-pointer">
                  Multi-Custódia
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Portaria central + porteiros de torre. Encomendas passam por múltiplos pontos de custódia.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {custodyMode === 'multi_custody' && (
        <Card>
          <CardHeader>
            <CardTitle>Locais Físicos</CardTitle>
            <CardDescription>
              Cadastre portarias, torres e armários disponíveis neste condomínio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingLocations ? (
              <p className="text-sm text-muted-foreground">Carregando locais...</p>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum local cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {rootLocations.map((loc) => (
                  <div key={loc.id}>
                    <LocationItem
                      location={loc}
                      onDelete={handleDeleteLocation}
                    />
                    {childLocations(loc.id).map((child) => (
                      <div key={child.id} className="ml-6 mt-1">
                        <LocationItem
                          location={child}
                          onDelete={handleDeleteLocation}
                          parentName={loc.name}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Local
              </h4>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="loc-name">Nome</Label>
                  <Input
                    id="loc-name"
                    placeholder="Ex: Torre A, Armário 1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newType} onValueChange={(v) => { setNewType(v as LocationType); setNewParentId(''); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Portaria Central</SelectItem>
                      <SelectItem value="tower">Torre</SelectItem>
                      <SelectItem value="locker">Armário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newType === 'locker' && towers.length > 0 && (
                  <div>
                    <Label>Torre (pai)</Label>
                    <Select value={newParentId} onValueChange={setNewParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a torre" />
                      </SelectTrigger>
                      <SelectContent>
                        {towers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleAddLocation} disabled={!newName.trim() || saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LocationItem({ location, onDelete, parentName }: { location: Location; onDelete: (id: string) => void; parentName?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{location.name}</span>
            <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[location.type as LocationType]}`}>
              {TYPE_LABELS[location.type as LocationType]}
            </Badge>
          </div>
          {parentName && (
            <p className="text-xs text-muted-foreground mt-0.5">{parentName}</p>
          )}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{location.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(location.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
