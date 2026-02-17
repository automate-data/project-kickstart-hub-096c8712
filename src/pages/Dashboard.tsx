import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { Package as PackageType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package as PackageIcon, Camera, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PackagePhoto } from '@/components/PackagePhoto';

export default function Dashboard() {
  const { condominium } = useCondominium();
  const [pendingPackages, setPendingPackages] = useState<PackageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchPendingPackages(); }, [condominium?.id]);

  const fetchPendingPackages = async () => {
    if (!condominium?.id) {
      setPendingPackages([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('packages')
      .select(`*, resident:residents(*)`)
      .eq('status', 'pending')
      .eq('condominium_id', condominium.id)
      .order('received_at', { ascending: false })
      .limit(10);
    if (data) setPendingPackages(data as unknown as PackageType[]);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col items-center py-8">
        <Link to="/receive">
          <Button size="lg" className="h-32 w-32 rounded-3xl flex flex-col gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Camera className="w-10 h-10" />
            <span className="text-lg font-semibold">Receber</span>
          </Button>
        </Link>
        <p className="text-muted-foreground mt-4 text-center">Toque para registrar nova encomenda</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />Aguardando retirada
          </h2>
          <Badge variant="secondary" className="text-sm">{pendingPackages.length}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="flex gap-4"><div className="w-16 h-16 bg-muted rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : pendingPackages.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" /><p className="text-muted-foreground">Todas as encomendas foram retiradas!</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pendingPackages.map((pkg) => (
              <Link key={pkg.id} to="/packages">
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pkg.resident?.full_name || 'Morador não identificado'}</p>
                        <p className="text-sm text-muted-foreground">{pkg.resident ? `${pkg.resident.block} - ${pkg.resident.apartment}` : '—'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(pkg.received_at), { addSuffix: true, locale: ptBR })}</p>
                      </div>
                      <PackageIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {pendingPackages.length > 0 && (
          <Link to="/packages" className="block"><Button variant="outline" className="w-full">Ver todas as encomendas</Button></Link>
        )}
      </div>
    </div>
  );
}
