

## Diagnóstico

A `/packages` da Helena (porteira do Bloco A) mostra a visão da **portaria central**, não a dela:

| Tela | O que mostra hoje | O que deveria mostrar |
|---|---|---|
| `/tower-dashboard` | 2 no Bloco + 1 no Armário = 3 pacotes pendentes **no Bloco A** ✅ | (já está certo) |
| `/packages` Aguardando | 0 (filtra pela central) ❌ | **3** (mesmos do tower-dashboard) |
| `/packages` Retiradas | 4 transferidos (visão da central) ❌ | Apenas pacotes que passaram pelo Bloco A e foram retirados |

**Causa**: a lógica atual de `Packages.tsx` assume que o usuário é da central. Quando `isTowerScopedUser = true`, ela usa `centralLocationId` como referência mesmo assim.

## Correção

Quando o usuário tem `location_id` específico (escopo de bloco/torre), a `/packages` passa a usar esse `location_id` no lugar do `centralLocationId`:

### Aba "Aguardando"
- Filtro: `status = 'pending' AND current_location_id = userLocationId`
- Espelha exatamente o que `/tower-dashboard` lista (mesmas 3 encomendas: 2 no bloco + 1 no armário)
- O número grande "Aguardando retirada" passa a mostrar **3** no caso da Helena

### Aba "Retiradas"
- Filtro: pacotes `picked_up` cuja **última location antes da retirada** foi o `userLocationId`
  - Implementação prática: `status = 'picked_up' AND current_location_id = userLocationId`
  - (Quando o porteiro do bloco confirma a retirada, o pacote permanece com `current_location_id = bloco`)
- Remove o conceito de "Transferido para Bloco X" pra esse usuário (não faz sentido — ele é o destino)

### Cartão "+ N em outros blocos"
- Já foi escondido na iteração anterior pra `isTowerScopedUser` ✅ (mantém)

### Contagem "Retiradas hoje"
- Para tower-scoped: `picked_up AND current_location_id = userLocationId AND picked_up_at >= hoje`

## Arquivo a alterar

**`src/pages/Packages.tsx`**

1. Adicionar state `userLocationId: string | null` (preenchido junto com `isTowerScopedUser` no `useEffect` existente — basta trocar o `select('id')` por `select('id, location_id')` e guardar o valor)

2. Em `fetchPackagesPage`, criar branch novo no início:
   ```ts
   const scopeLocationId = isTowerScopedUser ? userLocationId : centralLocationId;
   
   if (userLocationId && status === 'pending') {
     query = query.eq('status', 'pending').eq('current_location_id', userLocationId);
   } else if (userLocationId && status === 'picked_up') {
     query = query.eq('status', 'picked_up').eq('current_location_id', userLocationId);
   } else if (centralLocationId && status === 'pending') {
     // ... lógica existente da central
   }
   ```
   Passar `userLocationId` como parâmetro novo de `fetchPackagesPage` e incluir no `queryKey`.

3. Em `fetchCounts`, adicionar branch tower-scoped antes da lógica da central:
   - `pendingQuery`: `.eq('status','pending').eq('current_location_id', userLocationId)`
   - `pickedUpQuery`: `.eq('status','picked_up').eq('current_location_id', userLocationId).gte('picked_up_at', todayIso)`
   - `pendingElsewhereCount`: continua 0 (já está)

4. Na `PackageCard`, ajustar `isTransferredAway`:
   - Para tower-scoped, nunca é "transferido pra fora" (ele é o destino), então o badge "Transferido para X" não aparece
   - Condição nova: `isTransferredAway = !isTowerScopedUser && pkg.status === 'pending' && centralLocationId && current_location_id !== centralLocationId`

## Validação manual

1. Login Helena (`tower_doorman` Bloco A) → `/packages`
   - "Aguardando retirada" = **3** (igual ao tower-dashboard)
   - Lista mostra os 3 pacotes pendentes do Bloco A (sem badge "Transferido")
   - Aba "Retiradas" mostra apenas os pacotes que ela já entregou no Bloco A
2. Confirmar retirada via `/packages` → some de "Aguardando", aparece em "Retiradas hoje" e no contador
3. Login admin/portaria central → comportamento atual mantido (visão da central + "+ N em outros blocos")
4. Condomínio simples (não multi-custódia) → nada muda

## Sobre a `helena.silva` com location_id NULL

É cadastro inválido — usuário com role `tower_doorman` precisa ter `location_id`. Sugestões (fora desta correção):
- Validar no formulário de criação de staff que `tower_doorman` exige `location_id`
- Limpeza one-shot: identificar e corrigir/remover esse usuário órfão

Posso fazer essa limpeza/validação numa próxima iteração — não bloqueia a correção atual.

## Fora de escopo

- Limpeza da `helena.silva` (cadastro inválido)
- Validação no form de staff
- Esconder rota `/packages` pra `tower_doorman` (alternativa: como agora ela mostra o conteúdo certo, faz sentido manter)

