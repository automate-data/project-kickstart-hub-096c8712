import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCondominium } from '@/hooks/useCondominium';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowRight, ArrowLeft, Check, Loader2, Plus, X, Users, Home } from 'lucide-react';

type Step = 1 | 2 | 3;

const GROUP_LABEL_OPTIONS = ['Bloco', 'Torre', 'Rua', 'Quadra'];
const UNIT_LABEL_OPTIONS = ['Apartamento', 'Casa', 'Sala'];

export default function Setup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useCondominium();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2
  const [unitType, setUnitType] = useState('apartment');
  const [groupLabel, setGroupLabel] = useState('Bloco');
  const [customGroupLabel, setCustomGroupLabel] = useState('');
  const [unitLabel, setUnitLabel] = useState('Apartamento');
  const [customUnitLabel, setCustomUnitLabel] = useState('');
  const [groupInput, setGroupInput] = useState('');
  const [groups, setGroups] = useState<string[]>([]);

  const effectiveGroupLabel = groupLabel === 'custom' ? customGroupLabel : groupLabel;
  const effectiveUnitLabel = unitLabel === 'custom' ? customUnitLabel : unitLabel;

  const addGroup = () => {
    const items = groupInput.split(',').map(s => s.trim()).filter(Boolean);
    const newGroups = [...new Set([...groups, ...items])];
    setGroups(newGroups);
    setGroupInput('');
  };

  const removeGroup = (g: string) => setGroups(groups.filter(x => x !== g));

  const handleFinish = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { data: newCondo, error } = await supabase.from('condominiums').insert({
        name,
        cnpj: cnpj || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        phone: phone || null,
        email: email || null,
        unit_type: unitType,
        group_label: effectiveGroupLabel,
        unit_label: effectiveUnitLabel,
        groups: groups,
        setup_completed: true,
        admin_user_id: user.id,
      } as any).select('id').single();

      if (error) throw error;

      // Link admin to the new condominium
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: user.id,
        role: 'admin' as any,
        condominium_id: newCondo.id,
      });

      if (roleError) console.error('Error creating role link:', roleError);

      await refetch();
      toast({ title: 'Condomínio configurado com sucesso!' });
      navigate('/');
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Configuração do Condomínio</h1>
          <p className="text-muted-foreground">Configure os dados do condomínio antes de começar</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-12 bg-primary' : s < step ? 'w-8 bg-primary/50' : 'w-8 bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Dados do Condomínio</CardTitle>
              <CardDescription>Informações jurídicas e de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do condomínio *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Residencial Park" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input value={state} onChange={e => setState(e.target.value)} maxLength={2} placeholder="SP" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 11 3333-3333" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@condominio.com" />
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full" disabled={!name.trim()}>
                Próximo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Home className="w-5 h-5" />Estrutura e Nomenclaturas</CardTitle>
              <CardDescription>Defina a organização do condomínio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Tipo de condomínio</Label>
                <RadioGroup value={unitType} onValueChange={setUnitType} className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'apartment', label: 'Apartamentos' },
                    { value: 'house', label: 'Casas' },
                    { value: 'mixed', label: 'Misto' },
                  ].map(opt => (
                    <Label
                      key={opt.value}
                      htmlFor={opt.value}
                      className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        unitType === opt.value ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                      {opt.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Rótulo do agrupamento (ex: Bloco, Torre, Rua)</Label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_LABEL_OPTIONS.map(opt => (
                    <Button
                      key={opt}
                      variant={groupLabel === opt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGroupLabel(opt)}
                    >{opt}</Button>
                  ))}
                  <Button
                    variant={groupLabel === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupLabel('custom')}
                  >Outro...</Button>
                </div>
                {groupLabel === 'custom' && (
                  <Input value={customGroupLabel} onChange={e => setCustomGroupLabel(e.target.value)} placeholder="Digite o rótulo" />
                )}
              </div>

              <div className="space-y-3">
                <Label>Rótulo da unidade (ex: Apartamento, Casa)</Label>
                <div className="flex flex-wrap gap-2">
                  {UNIT_LABEL_OPTIONS.map(opt => (
                    <Button
                      key={opt}
                      variant={unitLabel === opt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUnitLabel(opt)}
                    >{opt}</Button>
                  ))}
                  <Button
                    variant={unitLabel === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUnitLabel('custom')}
                  >Outro...</Button>
                </div>
                {unitLabel === 'custom' && (
                  <Input value={customUnitLabel} onChange={e => setCustomUnitLabel(e.target.value)} placeholder="Digite o rótulo" />
                )}
              </div>

              <div className="space-y-3">
                <Label>Lista de {effectiveGroupLabel.toLowerCase()}s</Label>
                <div className="flex gap-2">
                  <Input
                    value={groupInput}
                    onChange={e => setGroupInput(e.target.value)}
                    placeholder="Ex: A, B, C, D"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGroup())}
                  />
                  <Button variant="outline" size="icon" onClick={addGroup}><Plus className="w-4 h-4" /></Button>
                </div>
                {groups.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => (
                      <Badge key={g} variant="secondary" className="gap-1 px-3 py-1">
                        {g}
                        <button onClick={() => removeGroup(g)}><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />Voltar
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1" disabled={!effectiveGroupLabel || !effectiveUnitLabel}>
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Resumo e Conclusão</CardTitle>
              <CardDescription>Revise as configurações antes de concluir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Nome:</strong> {name}</p>
                {cnpj && <p><strong>CNPJ:</strong> {cnpj}</p>}
                {address && <p><strong>Endereço:</strong> {address}{city ? `, ${city}` : ''}{state ? ` - ${state}` : ''}</p>}
                <p><strong>Tipo:</strong> {unitType === 'apartment' ? 'Apartamentos' : unitType === 'house' ? 'Casas' : 'Misto'}</p>
                <p><strong>Agrupamento:</strong> {effectiveGroupLabel}</p>
                <p><strong>Unidade:</strong> {effectiveUnitLabel}</p>
                {groups.length > 0 && <p><strong>{effectiveGroupLabel}s:</strong> {groups.join(', ')}</p>}
              </div>

              <p className="text-sm text-muted-foreground">
                Após concluir, você poderá cadastrar moradores e equipe pelo menu principal.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />Voltar
                </Button>
                <Button onClick={handleFinish} className="flex-1" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Check className="w-4 h-4 mr-2" />Concluir Setup</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
