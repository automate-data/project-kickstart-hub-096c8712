
# Corrigir risco vertical fantasma na assinatura

## Causa confirmada
O botão **"Limpar"** só é renderizado depois do primeiro pixel desenhado (`{hasDrawn && <Button…>}`). Quando ele aparece:

1. O container ganha altura → layout shift empurra o canvas para cima.
2. O `ResizeObserver` do canvas dispara `setupCanvas()` **no meio do traço**.
3. `setupCanvas` faz `canvas.width = …` + `ctx.setTransform` + `ctx.scale`, o que **reseta o subpath atual** (o `beginPath`/`moveTo` do `pointerdown` é perdido).
4. O próximo `lineTo(x, y)` do `pointermove` desenha uma linha do canto (0,0) até a posição atual da caneta → **risco vertical/diagonal fantasma**.

## Mudanças (somente em `src/components/SignatureCanvas.tsx`)

### 1. Reservar o espaço do botão "Limpar" desde o mount
Renderizar o botão sempre, alternando apenas `visibility`/`pointer-events` enquanto `!hasDrawn`. Sem layout shift → sem ResizeObserver disparando durante o traço.

```tsx
<Button
  variant="ghost" size="sm" onClick={handleClear}
  className={`gap-1 ${hasDrawn ? '' : 'invisible pointer-events-none'}`}
>
  <Eraser className="w-3 h-3" /> Limpar
</Button>
```

### 2. Não reconfigurar o canvas enquanto o usuário desenha
Em `setupCanvas()`, se `isDrawing.current === true`, sair imediatamente e marcar `pendingResize = true`. No `handlePointerUp`, se `pendingResize`, chamar `setupCanvas()` uma vez. Defesa em profundidade caso outro layout shift apareça no futuro.

### 3. Remover listeners de `window resize` / `orientationchange`
O `ResizeObserver` no próprio canvas já cobre mudanças reais de tamanho. Os eventos de `window` geram falsos positivos no mobile (barra de URL aparecendo/sumindo ao tocar a tela) que reiniciariam o path.

### 4. Reiniciar o path após qualquer `setupCanvas`
Depois de `ctx.scale(dpr,dpr)` + `applyStrokeStyle`, chamar `ctx.beginPath()` para não deixar subpath pendurado.

### 5. Descartar segmentos "impossíveis" como defesa final
No `handlePointerMove`, se a distância entre `(lastX,lastY)` e `(x,y)` for maior que ~80% da menor dimensão do canvas em um único frame, ignorar o segmento (fazer só `moveTo`). Garante que mesmo um glitch residual não vire um risco enorme.

## Verificação
- Abrir `PickupDialog` / `TowerCollect` no mobile, dar um toque curtíssimo (2–3 px). Nenhum risco vertical do topo deve aparecer.
- Repetir 10 assinaturas seguidas: o botão "Limpar" não causa layout shift visível, e o traço se preserva ao rotacionar o device.

## Fora de escopo
- Não mexer em `PickupDialog`, `CustodyDialogs`, `TowerCollect`.
- Não trocar por biblioteca externa.
