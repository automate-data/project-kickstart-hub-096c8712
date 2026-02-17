import { useNavigate } from 'react-router-dom';
import { useCondominium } from '@/hooks/useCondominium';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Check, Plus, LogOut } from 'lucide-react';

export default function SelectCondominium() {
  const navigate = useNavigate();
  const { condominiums, condominium, selectCondominium } = useCondominium();
  const { signOut, role } = useAuth();
  const isAdmin = role === 'admin';

  const handleSelect = (id: string) => {
    selectCondominium(id);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Selecionar Condomínio</h1>
          <p className="text-muted-foreground">Escolha o condomínio que deseja gerenciar</p>
        </div>

        <div className="space-y-3">
          {condominiums.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                condominium?.id === c.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelect(c.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.city}{c.state ? ` - ${c.state}` : ''}
                    {!c.setup_completed && ' • Setup pendente'}
                  </p>
                </div>
                {condominium?.id === c.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {isAdmin && (
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/setup')}>
              <Plus className="w-4 h-4" /> Novo Condomínio
            </Button>
          )}
          <Button variant="ghost" className="w-full gap-2 text-destructive" onClick={() => signOut()}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
