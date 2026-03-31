import { useRef, useState } from 'react';
import { Package } from '@/types';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/SignatureCanvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, X } from 'lucide-react';

// ─────────────────────────────────────────
// TransferDialog
// ─────────────────────────────────────────

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackages: Package[];
  toLocationName: string;
  onConfirm: (signatureData: string) => Promise<void>;
}

export function TransferDialog({
  open,
  onOpenChange,
  selectedPackages,
  toLocationName,
  onConfirm,
}: TransferDialogProps) {
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) return;
    const data = signatureRef.current.getSignatureData();
    if (!data) return;

    setIsSubmitting(true);
    try {
      await onConfirm(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Confirmar Transferência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Você está transferindo{' '}
            <span className="font-semibold text-foreground">{selectedPackages.length}</span>{' '}
            encomenda(s) para{' '}
            <span className="font-semibold text-foreground">{toLocationName}</span>.
          </p>

          {/* Package recipient list */}
          <ScrollArea className="max-h-40 rounded-md border p-3">
            <ul className="space-y-1.5">
              {selectedPackages.map(pkg => (
                <li key={pkg.id} className="text-sm text-foreground">
                  <span className="font-medium">{pkg.resident?.full_name || 'Não identificado'}</span>
                  {pkg.resident && (
                    <span className="text-muted-foreground">
                      {' '}— Bloco {pkg.resident.block}, Apto {pkg.resident.apartment}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>

          {/* Signature */}
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              Assinatura do porteiro responsável
            </p>
            <SignatureCanvas ref={signatureRef} onSignatureChange={setHasSignature} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={!hasSignature || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// LockerDialog
// ─────────────────────────────────────────

interface LockerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: Package | null;
  towerName: string;
  onConfirm: (lockerReference: string, sendWhatsApp: boolean) => Promise<void>;
}

export function LockerDialog({
  open,
  onOpenChange,
  pkg,
  towerName,
  onConfirm,
}: LockerDialogProps) {
  const [lockerRef, setLockerRef] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const residentFirstName = pkg?.resident?.full_name?.split(' ')[0] || 'Morador';

  const handleConfirm = async () => {
    if (!lockerRef.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(lockerRef.trim(), sendWhatsApp);
      setLockerRef('');
      setSendWhatsApp(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pkg) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Alocar em Armário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Resident info */}
          <div className="text-center">
            <p className="font-medium text-foreground">{pkg.resident?.full_name || 'Não identificado'}</p>
            {pkg.resident && (
              <p className="text-sm text-muted-foreground">
                Bloco {pkg.resident.block} - Apto {pkg.resident.apartment}
              </p>
            )}
          </div>

          {/* Locker input */}
          <div className="space-y-2">
            <Label htmlFor="locker-ref">Número ou identificação do armário</Label>
            <Input
              id="locker-ref"
              placeholder="Ex: 3, A7, Prateleira 2"
              value={lockerRef}
              onChange={e => setLockerRef(e.target.value)}
            />
          </div>

          {/* WhatsApp preview */}
          {lockerRef.trim() && (
            <div className="space-y-3">
              <Label>Notificação WhatsApp</Label>
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                Olá {residentFirstName}! Sua encomenda está disponível no armário{' '}
                <span className="font-medium text-foreground">{lockerRef.trim()}</span> da{' '}
                <span className="font-medium text-foreground">{towerName}</span>. Retire quando preferir.
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="send-whatsapp" className="text-sm cursor-pointer">
                  Enviar notificação
                </Label>
                <Switch
                  id="send-whatsapp"
                  checked={sendWhatsApp}
                  onCheckedChange={setSendWhatsApp}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={!lockerRef.trim() || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmar Alocação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
