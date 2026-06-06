import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SignatureCanvas, SignatureCanvasRef } from './SignatureCanvas';
import { PackagePhoto } from './PackagePhoto';
import { Package } from '@/types';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface BatchPickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: Package[];
  onConfirm: (signatureData: string) => Promise<void>;
}

export function BatchPickupDialog({ open, onOpenChange, packages, onConfirm }: BatchPickupDialogProps) {
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (packages.length === 0) return null;

  const resident = packages[0].resident;
  const count = packages.length;

  const handleConfirm = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) return;
    const data = signatureRef.current.getSignatureData();
    if (!data) return;
    setIsSubmitting(true);
    try {
      await onConfirm(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Confirmar retirada de {count} encomendas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="font-medium text-foreground">{resident?.full_name || 'Não identificado'}</p>
            {resident && (
              <p className="text-sm text-muted-foreground">
                Bloco {resident.block} - Apto {resident.apartment}
              </p>
            )}
          </div>

          <ScrollArea className="max-h-48 rounded-md border">
            <ul className="divide-y">
              {packages.map((pkg) => (
                <li key={pkg.id} className="flex items-center gap-3 p-2">
                  <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
                    <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="truncate font-medium">{pkg.carrier || 'Transportadora não identificada'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(pkg.received_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              Assine para confirmar a retirada de todas as encomendas
            </p>
            <SignatureCanvas ref={signatureRef} onSignatureChange={setHasSignature} />
            <p className="text-center text-xs text-muted-foreground">
              {resident?.full_name || 'Morador'}
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!hasSignature || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Registrando {count} retiradas...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirmar retirada de {count} encomendas
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
