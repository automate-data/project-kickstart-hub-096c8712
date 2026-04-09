

## Plano: Retirada simplificada para encomendas em armário

### Contexto
Atualmente, todas as retiradas exigem assinatura digital via `PickupDialog`. Para encomendas alocadas em armário, o fluxo deve ser diferente: o porteiro do bloco verifica que o armário está vazio e clica em "Confirmar Retirada" (botão azul), sem assinatura. Uma notificação WhatsApp é enviada confirmando a retirada.

### Mudanças

**1. `src/pages/TowerDashboard.tsx`**
- Para pacotes com `locker_reference`, trocar o botão "Retirar" (que abre `PickupDialog`) por um botão azul "Confirmar Retirada" que chama uma nova função `handleLockerPickup`.
- `handleLockerPickup`: atualiza o pacote como `picked_up` (sem `signature_data`), envia a confirmação WhatsApp via `send-pickup-confirmation`, e atualiza a lista.
- Manter o botão "Retirar" com assinatura apenas para pacotes **sem** `locker_reference`.

**2. Botão visual**
- Botão azul com ícone `CheckCircle2` e texto "Confirmar Retirada".
- Sem dialog de assinatura — ação direta com um estado de loading no próprio botão.
- Opcionalmente, um `confirm()` nativo do browser ou um pequeno dialog de confirmação simples (sem assinatura) para evitar cliques acidentais.

**3. Nenhuma mudança na Edge Function**
- A função `send-pickup-confirmation` já funciona sem depender de assinatura. Será reutilizada como está.

### Detalhes técnicos

```text
Pacote sem armário:
  [Retirar] → PickupDialog (assinatura) → handlePickup()

Pacote em armário:
  [Confirmar Retirada] (azul) → confirm dialog simples → handleLockerPickup()
    ├─ UPDATE packages SET status='picked_up', picked_up_at, picked_up_by (sem signature_data)
    ├─ supabase.functions.invoke('send-pickup-confirmation')
    └─ toast + refresh
```

Arquivos modificados: apenas `src/pages/TowerDashboard.tsx`.

