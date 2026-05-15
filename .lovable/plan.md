# Recalibrar a área de assinatura

## Objetivo
Corrigir o desalinhamento progressivo entre a ponta da caneta e o traço desenhado em `SignatureCanvas`, garantindo precisão consistente em qualquer dispositivo, DPR, zoom ou momento da animação do Dialog.

## Mudanças (apenas em `src/components/SignatureCanvas.tsx`)

### 1. Usar o `devicePixelRatio` real
Substituir o fator fixo `2` por `window.devicePixelRatio || 1` ao dimensionar o buffer e ao aplicar `ctx.scale`. Isso elimina o offset em telas com DPR ≠ 2 e quando o usuário dá zoom no navegador.

### 2. Recalcular o buffer dinamicamente com `ResizeObserver`
Encapsular a inicialização do canvas (medir `getBoundingClientRect`, ajustar `canvas.width/height`, `ctx.scale`, estilos de stroke) em uma função `setupCanvas()`. Chamá-la:
- No mount.
- Sempre que o `ResizeObserver` detectar mudança de tamanho do canvas (cobre fim da animação do Dialog, rotação, abertura do teclado, mudança de zoom, fontes carregando).

Quando o tamanho mudar **depois** que o usuário já desenhou, preservar o conteúdo: salvar `toDataURL()` antes do resize e re-desenhar via `drawImage` no novo buffer. Se ainda estiver vazio, apenas reconfigurar.

### 3. Bloquear gestos do navegador na área de assinatura
Trocar `touch-action-manipulation` por `touch-none` (Tailwind) na `<canvas>`. Impede pinch-zoom e double-tap-zoom acidentais, que são a causa mais comum de "descalibração persistente" durante uma sessão.

### 4. Migrar para Pointer Events
Substituir handlers `onMouseDown/Move/Up` e `onTouchStart/Move/End` por `onPointerDown/Move/Up/Cancel/Leave`. Vantagens:
- Coordenadas unificadas para mouse, dedo e caneta.
- `setPointerCapture` no `pointerdown` garante que o `pointermove`/`up` continue chegando mesmo se o ponteiro sair da área (evita traços "presos").
- Filtragem opcional por `pointerType` ('pen', 'touch', 'mouse').

### 5. Cálculo de posição mais robusto
Em `getPos`, usar sempre `e.clientX/Y - rect.left/top`. Não multiplicar por DPR (o `ctx.scale(dpr, dpr)` já cuida disso). Garantir que `rect` é lido a cada evento (não cachear), pois o Dialog pode ter se reposicionado.

### 6. Verificação manual após o fix
Testar no preview mobile e em um device real:
- Assinar logo após abrir o Dialog (cobre a animação).
- Rotacionar o device com o Dialog aberto e assinar de novo.
- Aplicar zoom de pinça fora do canvas e tentar assinar.
- Repetir 5 assinaturas seguidas em diferentes Dialogs (`PickupDialog`, `TransferDialog`) sem recarregar a página.

## Fora de escopo
- Não mexer em `PickupDialog.tsx` nem `CustodyDialogs.tsx` — só consomem o componente via ref, a API pública (`isEmpty`, `getSignatureData`, `clear`) continua igual.
- Não trocar por bibliotecas externas (`signature_pad` etc.) nesta iteração; as correções acima resolvem a causa raiz com mudanças mínimas.
