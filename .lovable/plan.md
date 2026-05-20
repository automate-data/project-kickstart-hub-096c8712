# Suavização da assinatura: coalesced events + curva quadrática

## Objetivo
Tornar o traço da caneta visivelmente mais suave e fiel ao movimento, especialmente em:
- Movimentos rápidos (hoje perdem pontos → traço com cantos).
- Movimentos lentos (hoje aparece serrilhado pixel-a-pixel).

Sem alterar layout, sem dependências novas, sem mexer em `PickupDialog`/`TowerCollect`/`CustodyDialogs`.

## Arquivo afetado
Apenas `src/components/SignatureCanvas.tsx`.

## Mudanças

### 1. Coalesced events no `pointermove`
Pointer events nativos entregam 1 evento por frame mesmo quando a caneta amostra a 120–240Hz. Os pontos intermediários ficam dentro de `event.getCoalescedEvents()`.

- Em `handlePointerMove`, em vez de processar só `e`, iterar sobre `e.nativeEvent.getCoalescedEvents()` (fallback para `[e.nativeEvent]` quando indisponível).
- Cada amostra coalesced passa pela mesma lógica de validação (descarte de salto impossível) e alimenta o buffer de pontos.

Resultado: traço rápido deixa de ter "cantos" porque desenhamos todos os pontos que a caneta capturou.

### 2. Suavização com `quadraticCurveTo`
Trocar `lineTo(x,y)` por uma curva quadrática que usa o ponto médio entre amostras consecutivas como ponto de controle. Algoritmo padrão para signature pads:

```text
ponto anterior: P0
ponto atual:    P1
ponto novo:     P2
ctx.quadraticCurveTo(P1.x, P1.y, midpoint(P1,P2).x, midpoint(P1,P2).y)
```

- Manter `lastPos` + um `prevPos` (penúltimo ponto) no ref.
- No `pointerdown`: `moveTo(p)` e gravar `lastPos = prevPos = p`.
- A cada amostra coalesced no `pointermove`: desenhar curva entre meio(prev,last) → last (controle) → meio(last,novo); shift dos pontos.
- No `pointerup`: fechar com um `lineTo` no último ponto para não cortar o final do traço.

Resultado: traço lento deixa de ser serrilhado; finais e curvas ficam orgânicos.

### 3. Preservar defesas existentes
- Validação de "salto impossível" (>80% da menor dimensão em 1 frame) continua, aplicada por amostra coalesced. Se disparar, reinicia o subpath com `moveTo` e zera `prevPos`/`lastPos`.
- `setupCanvas` bloqueado durante `isDrawing` permanece.
- Botão "Limpar" continua sempre renderizado (sem layout shift).
- `markDrawn()` chamado uma vez por `pointermove` (não por amostra coalesced) para não thrashar React state.

### 4. Sem rAF
Decidido na conversa anterior: rAF adicionaria 1 frame de latência sem ganho perceptível neste cenário. O ganho de performance vem de fazer menos `stroke()` síncronos? Não — fazemos um `stroke()` ao final do batch de coalesced events em vez de um por amostra, o que já reduz custo de paint sem precisar de rAF.

## Não incluso
- Pressão variável (`e.pressure` → `lineWidth`): fica para um próximo passo se quiser.
- Troca por biblioteca externa (signature_pad, perfect-freehand): fora de escopo.
- Mudanças em qualquer dialog/página que usa `SignatureCanvas`.

## Verificação
1. Assinar rápido em mobile com caneta capacitiva: traço não deve mais mostrar segmentos retos "cortando" curvas.
2. Assinar lentamente: linha contínua, sem serrilhado pixel-a-pixel.
3. Toque curtíssimo (2–3 px): apenas um ponto/pequeno traço, sem risco fantasma vertical (defesa antiga preservada).
4. 10 assinaturas seguidas no `PickupDialog` e `TowerCollect`: comportamento estável, sem regressão de layout.
