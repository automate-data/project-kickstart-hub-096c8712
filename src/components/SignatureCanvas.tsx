import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
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
    const activePointerId = useRef<number | null>(null);
    const hasDrawnRef = useRef(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const markDrawn = useCallback(() => {
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        setHasDrawn(true);
        onSignatureChange?.(true);
      }
    }, [onSignatureChange]);

    const applyStrokeStyle = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    // (Re)configure the canvas backing buffer to match its current CSS size and DPR.
    // Preserves any existing drawing across resizes (animation finishing, rotation, zoom...).
    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      // Skip if nothing changed (avoids wiping the canvas on no-op observer ticks).
      if (canvas.width === targetW && canvas.height === targetH) return;

      // Snapshot current drawing if any, so resizing doesn't erase the signature.
      let snapshot: HTMLImageElement | null = null;
      if (hasDrawnRef.current) {
        try {
          const data = canvas.toDataURL('image/png');
          snapshot = new Image();
          snapshot.src = data;
        } catch {
          snapshot = null;
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      applyStrokeStyle(ctx);

      if (snapshot) {
        const draw = () => ctx.drawImage(snapshot!, 0, 0, rect.width, rect.height);
        if (snapshot.complete) draw();
        else snapshot.onload = draw;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      isEmpty: () => !hasDrawnRef.current,
      getSignatureData: () => {
        if (!canvasRef.current || !hasDrawnRef.current) return null;
        return canvasRef.current.toDataURL('image/png');
      },
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const dpr = window.devicePixelRatio || 1;
          ctx.scale(dpr, dpr);
          applyStrokeStyle(ctx);
        }
        hasDrawnRef.current = false;
        setHasDrawn(false);
        onSignatureChange?.(false);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setupCanvas();

      const ro = new ResizeObserver(() => setupCanvas());
      ro.observe(canvas);

      const onWindowChange = () => setupCanvas();
      window.addEventListener('resize', onWindowChange);
      window.addEventListener('orientationchange', onWindowChange);

      return () => {
        ro.disconnect();
        window.removeEventListener('resize', onWindowChange);
        window.removeEventListener('orientationchange', onWindowChange);
      };
    }, [setupCanvas]);

    const getPos = (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Only primary button for mouse; allow all touch/pen input.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      activePointerId.current = e.pointerId;
      isDrawing.current = true;

      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      // Draw a tiny dot so a quick tap leaves a visible mark.
      ctx.lineTo(pos.x + 0.01, pos.y + 0.01);
      ctx.stroke();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      markDrawn();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
      isDrawing.current = false;
      activePointerId.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          /* no-op */
        }
      }
      // A tap (down → up without move) should still count as a signature mark.
      markDrawn();
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);
        applyStrokeStyle(ctx);
      }
      hasDrawnRef.current = false;
      setHasDrawn(false);
      onSignatureChange?.(false);
    };

    return (
      <div className="space-y-2">
        <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-card">
          <canvas
            ref={canvasRef}
            className="w-full h-32 touch-none cursor-crosshair select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={(e) => {
              // Don't end the stroke just because the pointer left the box —
              // pointer capture keeps move/up flowing. Only end if not captured.
              if (activePointerId.current === null) return;
            }}
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
