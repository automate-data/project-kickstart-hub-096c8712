## Adicionar botão "Alocar" na página de Encomendas (`/packages`)

Replicar a funcionalidade já existente no Dashboard para o modo `simple_locker`, permitindo alocar encomendas em armários direto da listagem de encomendas.

### Mudanças em `src/pages/Packages.tsx`

1. **Imports**:
   - Adicionar ícone `Boxes` do lucide-react
   - Importar `LockerDialog` de `@/components/custody/CustodyDialogs`
   - Importar tipo `Location` de `@/types`

2. **Estado novo**:
   - `lockers: Location[]` — lista de armários do condomínio
   - `allocatePkg: Package | null`
   - `allocateOpen: boolean`

3. **Buscar armários**: no useEffect que já carrega central location, quando `custody_mode === 'simple_locker'`, também buscar `locations` do tipo `locker` e salvar em `lockers`.

4. **Handlers** (idênticos ao Dashboard):
   - `handleAllocateClick(pkg, e)` — abre dialog
   - `handleConfirmAllocation(lockerReference, sendWhatsApp)`:
     - Acha locker por nome (match exato ou sufixo)
     - `UPDATE packages SET current_location_id = targetLocker.id`
     - `INSERT package_events` com `notes: locker_reference:XX`
     - `insertLog({ event_type: 'package_allocated_to_locker', ... })`
     - Chama edge function `send-locker-notification` com `tower_name: 'Portaria'` se WhatsApp habilitado
     - Toast + invalida queries + fetchCounts

5. **PackageCard**: na seção de status pendente (linha ~442), quando `isSimpleLocker` E não está transferido E o pacote está na central (sem locker alocado ainda) → renderizar **dois botões** lado a lado: `Alocar` (variant outline com ícone Boxes) + `Retirar`.
   - Se já está no armário (locationBadge indica "No Armário") → mostrar só `Retirar`.

6. **Renderizar `<LockerDialog>`** no fim do componente, com `towerName="Portaria"`.

### Comportamento esperado

- Modo `simple` e `multi_custody` → sem mudança visual.
- Modo `simple_locker`:
  - Encomenda pendente na portaria → botões `Alocar` + `Retirar`
  - Encomenda já alocada no armário → botão `Retirar` + badge "No Armário — posição X"
  - Após alocar → morador recebe WhatsApp com número do armário, lista atualiza.