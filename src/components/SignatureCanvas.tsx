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
    const pendingResize = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
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
    // NEVER runs while the user is drawing — that would reset the active path and
    // produce a phantom line from (0,0) to the pointer position.
    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (isDrawing.current) {
        pendingResize.current = true;
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width === targetW && canvas.height === targetH) return;

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
      ctx.beginPath();

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
          ctx.beginPath();
        }
        hasDrawnRef.current = false;
        lastPos.current = null;
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

      return () => {
        ro.disconnect();
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
      lastPos.current = pos;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + 0.01, pos.y + 0.01);
      ctx.stroke();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;
      const pos = getPos(e);

      // Defense-in-depth: discard impossibly long single-frame segments
      // (these indicate the path state was reset mid-stroke).
      if (lastPos.current) {
        const rect = canvas.getBoundingClientRect();
        const maxJump = Math.min(rect.width, rect.height) * 0.8;
        const dx = pos.x - lastPos.current.x;
        const dy = pos.y - lastPos.current.y;
        if (Math.hypot(dx, dy) > maxJump) {
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          lastPos.current = pos;
          return;
        }
      }

      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
      markDrawn();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
      isDrawing.current = false;
      activePointerId.current = null;
      lastPos.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          /* no-op */
        }
      }
      markDrawn();

      if (pendingResize.current) {
        pendingResize.current = false;
        setupCanvas();
      }
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
        ctx.beginPath();
      }
      hasDrawnRef.current = false;
      lastPos.current = null;
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
          />
        </div>
        {/* Always render to reserve layout space — avoids layout shift that would
            trigger ResizeObserver mid-stroke and produce phantom lines. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className={`gap-1 ${hasDrawn ? '' : 'invisible pointer-events-none'}`}
          aria-hidden={!hasDrawn}
          tabIndex={hasDrawn ? 0 : -1}
        >
          <Eraser className="w-3 h-3" />
          Limpar
        </Button>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
