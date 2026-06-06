## Objetivo

Espelhar o botão "Retirar todas" com "Alocar todas" no cabeçalho do grupo (mesmo morador + mesma localização) na página de Encomendas, permitindo alocar várias encomendas no mesmo armário em uma única operação e enviar **apenas 1 notificação WhatsApp** para o morador.

## Onde

- `src/pages/Packages.tsx` — `GroupHeader` e estado de batch
- `src/components/custody/CustodyDialogs.tsx` — `LockerDialog` aceita 1+ pacotes

## Mudanças

### 1. `LockerDialog` (CustodyDialogs.tsx)
- Aceitar `pkgs: Package[]` (manter `pkg` opcional para compat ou migrar tudo). Mais simples: adicionar prop opcional `packages?: Package[]`. Quando presente e length > 1, o título vira "Alocar N encomendas em Armário" e o preview do WhatsApp menciona "suas N encomendas estão disponíveis no armário X".
- Resident info usa o primeiro pacote (mesmo morador no grupo).
- `onConfirm(lockerReference, sendWhatsApp)` mantém a mesma assinatura — o caller decide o que fazer com a lista.

### 2. `Packages.tsx`
- Novo estado `batchAllocatePkgs: Package[]` + `batchAllocateOpen`.
- Novo handler `handleConfirmBatchAllocation(ref, sendWhatsApp)`:
  - Resolve `targetLocker` (igual ao single).
  - `UPDATE packages SET current_location_id = targetLocker.id WHERE id IN (...ids)`.
  - Insere N rows em `package_events` (uma por pacote) com `notes: 'locker_reference:<ref>'`.
  - 1 `insertLog` por pacote (event_type `package_allocated_to_locker`).
  - **Apenas 1** chamada `send-locker-notification` com o telefone do morador (mesma lógica de "Retirar todas").
  - Invalida queries, fecha dialog, limpa seleção.
- `GroupHeader`: adicionar botão "Alocar todas" ao lado de "Retirar todas", visível somente quando `isSimpleLocker` e os pacotes ainda estão na central (mesma condição do botão "Alocar" individual). Abre o `LockerDialog` em modo batch.
- Seleção via checkbox também ganha botão flutuante "Alocar selecionadas" análogo ao existente de retirada (se já houver UI flutuante; senão, manter apenas no header do grupo nesta primeira iteração).

### 3. Comportamento pós-alocação
- Permanece como já implementado para o caso individual: a alocação **não** marca como `picked_up` aqui em `Packages.tsx` (só `TowerDashboard.tsx` faz isso). Mantemos consistência com o fluxo atual da página Encomendas — sem mudar regra de negócio.

## Fora de escopo
- Mudar comportamento de "picked_up" automático ao alocar (já tratado em TowerDashboard).
- Alocar em armários diferentes na mesma operação — single locker por batch.
- Layout/UX de seleção múltipla nova.
