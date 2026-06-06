# Encomendas alocadas em armário: seção separada em Aguardando

## Comportamento

Hoje, ao alocar no armário, marcamos `picked_up` automaticamente. Mas:
- Itens legados (alocados antes da mudança) continuam `pending` e aparecem misturados no topo de Aguardando.
- O botão "Retirar" ainda pede assinatura e dispara WhatsApp, mesmo o fluxo já tendo encerrado.

Novo comportamento:

1. **Alocação não marca mais `picked_up`**. O pacote continua `pending`, mas passa a viver numa seção própria.
2. **Aba Aguardando ganha duas seções**:
   - **"Aguardando recebimento"** (topo) — encomendas ainda na portaria/central. Fluxo normal: Alocar / Retirar (com assinatura + notificação).
   - **"No armário — aguardando morador retirar"** (abaixo, colapsável) — encomendas já alocadas. Cada card mostra apenas um botão **"Confirmar retirada"** (um toque, sem assinatura, sem notificação WhatsApp). Header da seção mostra contagem.
3. **Contadores no topo** (`Aguardando retirada` / `Retiradas hoje`): "Aguardando retirada" passa a contar apenas encomendas fora de armário. Encomendas no armário contam num terceiro indicador discreto ("No armário: N") ou no header da própria seção — vou usar o header da seção para não poluir o topo.
4. **"Confirmar retirada"** num toque:
   - `status = 'picked_up'`, `picked_up_at = now()`, `picked_up_by = "Armário <ref>"`, `signature_data = null`.
   - Registra evento `package_picked_up_from_locker`.
   - **Não** envia WhatsApp.
5. **Backfill**: itens legados `pending` em location do tipo `locker` aparecem automaticamente nessa nova seção (mesma regra de filtragem).
6. Em `simple_locker` (Dashboard rápido), o card também deixa de marcar `picked_up` na alocação; a confirmação acontece em Packages.

## Detalhes técnicos

Arquivos:

- `src/pages/Packages.tsx`
  - `handleConfirmAllocation` / `handleConfirmBatchAllocation`: remover `status='picked_up'` / `picked_up_at` / `picked_up_by`. Manter apenas a mudança de `current_location_id` + evento `package_allocated_to_locker` + notificação WhatsApp do armário.
  - Filtros de listagem e contagem (modos `simple_locker` e `multi_custody`): em "Aguardando retirada" e no contador `pendingCount`, **excluir** pacotes cuja `current_location` é do tipo `locker` (carregar IDs de lockers do condomínio via `locations`).
  - Nova consulta paralela: `inLockerPackages` = `status='pending'` AND `current_location_id IN (lockerIds)`.
  - Render: dentro da aba Aguardando, renderizar primeiro os grupos atuais; depois um bloco "No armário — N encomendas" listando `inLockerPackages` com card simplificado e botão único "Confirmar retirada".
  - Novo handler `handleConfirmLockerPickup(pkg)`: update direto + evento, sem dialog, sem WhatsApp. Toast "Encomenda removida da lista".
- `src/pages/Dashboard.tsx`
  - `handleConfirmAllocation`: remover marcação `picked_up`; manter só transferência + evento + WhatsApp do armário. Após alocar, o card some da lista "Aguardando retirada" do dashboard (que já filtra por status pending na central).
- Sem mudanças de schema, edge function ou template Twilio.

## O que NÃO muda

- Alocação ainda dispara WhatsApp informando o número do armário (fluxo encerrado para o morador).
- Retirada normal (fora de armário) continua exigindo assinatura.
- Agrupamento por apartamento e retirada em lote da seção "Aguardando recebimento" permanecem como estão.
