

## Diagnóstico

**Como está hoje** na tela `/packages` (portaria central):

- Aba **"Aguardando"**: filtra `status='pending'` AND `current_location_id = central` → ✅ correto, some quando vai pro bloco
- Aba **"Retiradas"**: filtra apenas `status='picked_up'` → ❌ **só mostra encomendas que o morador retirou no fim**. Encomendas transferidas para o Bloco A continuam `status='pending'` (apenas mudaram de `current_location_id`), então **nunca aparecem como "retiradas" da central**.

Resultado: a portaria central perde a rastreabilidade do "quem levou da minha mão". As assinaturas dos porteiros de bloco existem em `package_events.signature_data` (confirmado no banco — todas têm `has_sig: true`), mas nenhuma tela exibe.

## O que mudar

A semântica de "Retirada" na portaria central passa a ser: **"saiu da minha custódia"** — seja porque o morador retirou direto, seja porque foi transferida para um bloco.

### 1. `src/pages/Packages.tsx` — aba "Retiradas" (modo multi_custody)

Quando `centralLocationId` existe, a query da aba `picked_up` muda para incluir **as duas situações**:

- Encomendas com `status='picked_up'` (retirada direta pelo morador na central), **OU**
- Encomendas pendentes que **já não estão mais** na central (foram transferidas)

Implementação: usar `.or()` do Supabase:
```ts
// Em fetchPackagesPage, quando status='picked_up' E centralLocationId existe:
query = supabase
  .from('packages')
  .select(`*, resident:residents(*), events:package_events(*, from_location:locations!from_location_id(name), to_location:locations!to_location_id(name))`, { count: 'exact' })
  .eq('condominium_id', condominiumId)
  .or(`status.eq.picked_up,and(status.eq.pending,current_location_id.neq.${centralLocationId})`)
  .order('received_at', { ascending: false })
```

O mesmo ajuste em `fetchCounts()` para o card "Retiradas hoje" — passa a contar tudo que **saiu da central hoje** (usando o `created_at` do evento de transferência mais recente, ou `picked_up_at`).

### 2. Card visual: distinguir os dois tipos

Na lista da aba "Retiradas", quando o pacote tem `status='pending'` (ou seja, foi transferido), o badge/botão muda:

- Status normal de retirada do morador: badge verde "Retirado por João Silva"
- Transferido pra bloco: badge azul "Transferido para Bloco A" (pegando do último `package_events` com `to_location`)

### 3. `PackageDetailsDialog.tsx` — exibir assinatura correta

Hoje só mostra `pkg.signature_data` (assinatura do morador). Adicionar lógica:

- Se `status='picked_up'` → mostrar assinatura do morador (como hoje)
- Se `status='pending'` mas saiu da central → buscar o último `package_events` de transferência **saindo** da central, exibir:
  - "Assinatura do recebedor — Porteiro do Bloco A"
  - imagem de `event.signature_data`
  - data/hora da transferência
  - quem assinou (nome via `transferred_by` → `profiles.full_name`)

Isso resolve o caso "5 pacotes transferidos juntos compartilham a mesma assinatura" — todos aparecerão individualmente na lista de retiradas da central, e ao abrir cada um a portaria verá a mesma assinatura do porteiro do Bloco A (já é assim que está salvo no banco).

### 4. Atualizar título e contador

- Texto do card "Retiradas hoje" → "Saídas hoje" (mais preciso) **OU** manter "Retiradas hoje" se preferir não mexer no vocabulário. Recomendo manter.
- Título da aba: manter "Retiradas".

## Arquivos modificados

- `src/pages/Packages.tsx` — query da aba "Retiradas" (modo multi_custody) + contador + visual do card
- `src/components/PackageDetailsDialog.tsx` — exibir assinatura de transferência quando aplicável

## Modo simple (não-multi-custody)

Sem mudanças. Tudo continua igual nos condomínios sem multi-custódia, já que `centralLocationId` é null e a lógica nova não dispara.

## Validação

1. Login como portaria central → aba "Retiradas" deve mostrar tanto pickups diretos quanto pacotes transferidos para blocos
2. Clicar num pacote transferido → dialog deve mostrar assinatura do porteiro do bloco que recebeu, com nome e horário
3. Fazer uma nova transferência em lote (5 pacotes) → todos devem aparecer na aba "Retiradas" da central com a mesma assinatura

