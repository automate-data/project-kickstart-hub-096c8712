
## Plano: Substituir popup nativo por dialog estilizado (cara de app)

### Diagnóstico
O popup branco no screenshot é um `window.confirm()` nativo do navegador (linha 228 de `src/pages/TowerDashboard.tsx`). Ele ignora todo o design system. Os demais dialogs do app (`PickupDialog`, `LockerDialog`, `Residents`, `Staff`, `AdvancedSettings`) já usam shadcn `Dialog`/`AlertDialog` com visual consistente — não precisam mudar.

### Mudança
Substituir o `window.confirm` por um `AlertDialog` shadcn (com cara de app: bordas arredondadas, sombra, tipografia do design system, botões primários azuis, ícone de pacote/armário no topo).

### Arquivo modificado
- `src/pages/TowerDashboard.tsx`

### Implementação
1. Adicionar estado `lockerPickupTarget: TowerPackage | null` para guardar a encomenda em confirmação.
2. Trocar `handleLockerPickup` em duas etapas:
   - `requestLockerPickup(pkg)`: apenas seta o target → abre o dialog.
   - `confirmLockerPickup()`: executa a lógica atual (update Supabase + WhatsApp + toast).
3. Renderizar um `AlertDialog` no final do JSX:
   - Ícone `Archive` em círculo azul claro no topo
   - Título: "Confirmar retirada do armário"
   - Descrição com nome do morador, unidade (Bloco/Apto) e referência do armário em destaque
   - Botão "Cancelar" (outline) + "Confirmar Retirada" (primário azul, com `Loader2` enquanto `lockerPickupLoading`)
   - Layout mobile-first (`max-w-sm mx-auto`, padding generoso) consistente com `PickupDialog` e `LockerDialog`

### Resultado visual
```text
┌─────────────────────────────────┐
│         ╭───╮                   │
│         │📦 │  (ícone azul)     │
│         ╰───╯                   │
│                                 │
│   Confirmar retirada            │
│   do armário                    │
│                                 │
│   Gustavo Diniz Decrescenzo     │
│   Bloco A — Apto 53             │
│   Armário: 9                    │
│                                 │
│   [Cancelar] [✓ Confirmar]     │
└─────────────────────────────────┘
```

Sem mudanças nos outros dialogs — eles já têm "cara de app".
