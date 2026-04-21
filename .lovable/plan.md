

## Diagnóstico

A Maria (portaria central) vê "4 Aguardando retirada", mas cada um aparece com badge "Transferido". Causa: existem 4 pacotes pendentes legados no banco com `current_location_id = NULL` (criados antes da multi-custódia).

A `/packages` trata esses órfãos de forma **inconsistente**:
- Query da aba "Aguardando" considera `current_location_id IS NULL` como "está na central" → entram na lista e no contador.
- `PackageCard` considera `current_location_id !== centralLocationId` como "transferido" → `null !== central_id` é true, então marca como "Transferido".

Resultado: 4 cards na aba errada com badge contraditório.

Pacotes envolvidos (Solar dos Pinheiros):
- `e2eb4cd2…`, `8a0ce83f…`, `160115e6…`, `55d5688c…` — todos `pending` com `current_location_id = NULL`.

Os 3 reais do Bloco A já estão corretos (não aparecem pra Maria — são da Helena).

## Correção

### Parte A — Migração one-shot dos órfãos

Para todo condomínio em `custody_mode = 'multi_custody'`, atualizar pacotes pendentes com `current_location_id IS NULL` para apontar pra `central` daquele condomínio:

```sql
UPDATE packages p
SET current_location_id = (
  SELECT id FROM locations
  WHERE condominium_id = p.condominium_id AND type = 'central'
  LIMIT 1
), updated_at = now()
WHERE p.status = 'pending'
  AND p.current_location_id IS NULL
  AND p.condominium_id IN (
    SELECT id FROM condominiums WHERE custody_mode = 'multi_custody'
  );
```

Efeito imediato: os 4 órfãos da Maria passam a apontar pra Portaria → contador continua 4, mas badge fica correto ("Na Central"), sem "Transferido".

### Parte B — Hardening da UI em `src/pages/Packages.tsx`

Tratar `current_location_id == null` como equivalente à central (consistente com a query):

1. Em `PackageCard`, ajustar `isTransferredAway`:
   ```ts
   const currentLocId = (pkg as any).current_location_id;
   const isTransferredAway =
     !isTowerScopedUser &&
     pkg.status === 'pending' &&
     !!centralLocationId &&
     currentLocId != null &&                    // null = na central
     currentLocId !== centralLocationId;
   ```

2. Em `getLocationBadge`, o branch que retorna "Na Central" já cobre `currentLoc == null` corretamente — manter como está.

Assim, mesmo que apareça novo órfão por bug futuro, o card mostra "Na Central" sem badge "Transferido" e fica clicável pra retirada.

## Validação manual

1. Login Maria (portaria central) em `/packages`:
   - "Aguardando retirada" continua **4**, mas cada card mostra badge **"Na Central"** (sem "Transferido").
   - Botão "Retirar" volta a aparecer nos 4 cards (antes só clicava em detalhes).
   - "+ 3 em outros blocos" continua mostrando os do Bloco A.
2. Login Helena (Bloco A) → comportamento atual mantido (3 pendentes do bloco).
3. Receber novo pacote (qualquer usuário) → entra com `current_location_id = central`, sem virar órfão.

## Fora de escopo

- Trigger pra forçar `current_location_id NOT NULL` em multi-custódia (pode virar próxima iteração se quiser garantia de schema).
- Limpeza do cadastro `helena.silva` com `location_id = NULL`.

