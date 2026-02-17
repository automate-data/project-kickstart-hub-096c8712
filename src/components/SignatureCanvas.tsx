import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export interface SignatureCanvasRef {
  isEmpty: () => boolean;
  getSignatureData: () => string | null;
  clear: () => void;
}

interface SignatureCanvasProps {
  onSignatureChange?: (hasSignature: boolean) => void;
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ onSignatureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useImperativeHandle(ref, () => ({
      isEmpty: () => !hasDrawn,
      getSignatureData: () => {
        if (!canvasRef.current || !hasDrawn) return null;
        return canvasRef.current.toDataURL('image/png');
      },
      clear: () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setHasDrawn(false);
        onSignatureChange?.(false);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    };

    const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      isDrawing.current = true;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      if (!hasDrawn) {
        setHasDrawn(true);
        onSignatureChange?.(true);
      }
    };

    const endDraw = () => {
      isDrawing.current = false;
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasDrawn(false);
      onSignatureChange?.(false);
    };

    return (
      <div className="space-y-2">
        <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-card">
          <canvas
            ref={canvasRef}
            className="w-full h-32 touch-action-manipulation cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
        {hasDrawn && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1">
            <Eraser className="w-3 h-3" />
            Limpar
          </Button>
        )}
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
