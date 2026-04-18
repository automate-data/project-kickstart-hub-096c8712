import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Timer, Calendar, Truck, User, PenTool, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { Package } from '@/types';
import { PackagePhoto } from '@/components/PackagePhoto';

interface PackageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: Package | null;
  centralLocationId?: string | null;
}

function formatStayDuration(receivedAt: string, pickedUpAt?: string | null): string {
  const start = new Date(receivedAt);
  const end = pickedUpAt ? new Date(pickedUpAt) : new Date();
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins} minutos`;
  const hrs = differenceInHours(end, start);
  if (hrs < 24) return `${hrs} horas`;
  const days = differenceInDays(end, start);
  return `${days} dias`;
}

export function PackageDetailsDialog({ open, onOpenChange, pkg, centralLocationId }: PackageDetailsDialogProps) {
  if (!pkg) return null;

  const events = (pkg as any).events as Array<any> | undefined;
  const currentLocationId = (pkg as any).current_location_id as string | null | undefined;

  const isTransferredAway =
    pkg.status === 'pending' &&
    !!centralLocationId &&
    currentLocationId !== centralLocationId;

  // Last transfer event leaving central
  const transferEvent = isTransferredAway
    ? events
        ?.filter((e) => e.from_location_id === centralLocationId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isTransferredAway ? 'Detalhes da Transferência' : 'Detalhes da Retirada'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          <div className="w-full h-48 rounded-lg overflow-hidden">
            <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
          </div>

          {/* Resident info */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{pkg.resident?.full_name || 'Não identificado'}</span>
            {pkg.resident && (
              <Badge variant="secondary">{pkg.resident.block}/{pkg.resident.apartment}</Badge>
            )}
          </div>

          {/* Carrier */}
          {pkg.carrier && (
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span>{pkg.carrier}</span>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Recebido:</span>
              <span>{format(new Date(pkg.received_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
            {isTransferredAway && transferEvent && (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Transferido:</span>
                <span>{format(new Date(transferEvent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {pkg.picked_up_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Retirado:</span>
                <span>{format(new Date(pkg.picked_up_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Permanência:</span>
              <span>{formatStayDuration(pkg.received_at, pkg.picked_up_at)}</span>
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {isTransferredAway
                  ? `Assinatura do recebedor${transferEvent?.to_location?.name ? ` — ${transferEvent.to_location.name}` : ''}`
                  : 'Assinatura de retirada'}
              </span>
            </div>

            {isTransferredAway ? (
              <>
                {transferEvent?.transferred_by_profile?.full_name && (
                  <p className="text-xs text-muted-foreground">
                    Assinado por: <span className="font-medium text-foreground">{transferEvent.transferred_by_profile.full_name}</span>
                  </p>
                )}
                {transferEvent?.signature_data ? (
                  <div className="border rounded-lg p-2 bg-card">
                    <img
                      src={transferEvent.signature_data}
                      alt="Assinatura do recebedor"
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma assinatura registrada</p>
                )}
              </>
            ) : pkg.signature_data ? (
              <div className="border rounded-lg p-2 bg-card">
                <img
                  src={pkg.signature_data}
                  alt="Assinatura do morador"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma assinatura registrada</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
