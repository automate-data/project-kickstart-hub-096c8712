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
import { SignatureCanvas, SignatureCanvasRef } from './SignatureCanvas';
import { Package } from '@/types';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { PackagePhoto } from './PackagePhoto';

interface PickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: Package | null;
  onConfirm: (signatureData: string) => Promise<void>;
}

export function PickupDialog({ open, onOpenChange, pkg, onConfirm }: PickupDialogProps) {
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pkg) return null;

  const handleConfirm = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) return;
    
    const signatureData = signatureRef.current.getSignatureData();
    if (!signatureData) return;

    setIsSubmitting(true);
    try {
      await onConfirm(signatureData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Confirmar Retirada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
            <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Morador:</span>
              <span className="font-medium">{pkg.resident?.full_name || 'Não identificado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unidade:</span>
              <span className="font-medium">
                {pkg.resident ? `Bloco ${pkg.resident.block} - Apto ${pkg.resident.apartment}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recebido em:</span>
              <span className="font-medium">
                {format(new Date(pkg.received_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              Assine para confirmar a retirada
            </p>
            <SignatureCanvas ref={signatureRef} onSignatureChange={setHasSignature} />
            <p className="text-center text-xs text-muted-foreground">
              {pkg.resident?.full_name || 'Morador'}
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!hasSignature || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2" />
            )}
            Confirmar retirada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
