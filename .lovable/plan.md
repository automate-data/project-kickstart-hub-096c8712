

## Objetivo

Em `/packages`, na aba **Aguardando**, mostrar um badge indicando **onde** cada encomenda está fisicamente — espelhando a linguagem do `/tower-dashboard`:

- `No Armário — posição 9` (quando alocada em locker)
- `No Bloco A` (quando está numa torre/bloco)
- `Na Central` (quando está na portaria central)

## Como funciona (regra)

Para cada pacote pendente:

1. Pegar o **último `package_event`** do pacote (ordenado por `created_at desc`).
2. Se esse evento tem `to_location.type === 'locker'`:
   - Extrair `locker_reference` do campo `notes` (formato `locker_reference:X`) — fallback pro nome da location.
   - Badge **âmbar**: `No Armário — posição {X}`.
3. Senão, usar a `current_location` do pacote:
   - Se for tipo `central` → badge cinza: `Na Central`.
   - Se for tipo `tower` → badge azul: `No {nome}` (ex: "No Bloco A").
   - Se `current_location_id` for `null` (legado) → badge cinza: `Na Central` (default).

Para condomínio em modo **simples** (`custody_mode === 'simple'`): nada muda, badge não aparece.

## Arquivo a alterar

**`src/pages/Packages.tsx`**

1. **Query**: ajustar o select dos `events` pra incluir o `type` da location:
   ```ts
   events:package_events(
     *,
     from_location:locations!from_location_id(name, type),
     to_location:locations!to_location_id(name, type)
   )
   ```
   E adicionar join da `current_location` no próprio package:
   ```ts
   current_location:locations!current_location_id(name, type)
   ```

2. **Helper** `getLocationBadge(pkg)` que retorna `{ label, variant }` aplicando a regra acima.

3. **PackageCard**: na aba `pending` (somente multi-custódia), renderizar o novo badge logo abaixo (ou ao lado de) `Timer`. Mantém os badges existentes ("Transferido para…", "Retirada pelo morador") inalterados.

4. **Tipos**: estender o tipo `Package` local (cast) para incluir `current_location?: { name; type }` — sem mudar `src/types/index.ts` (uso ad-hoc via `as any`, padrão já usado no arquivo).

## Validação manual

1. Helena (Bloco A) em `/packages` → cada pendente mostra `No Armário — posição X` ou `No Bloco A`, batendo com `/tower-dashboard`.
2. Admin/central em `/packages` → pendentes na central mostram `Na Central`; pendentes que ela ainda enxerga já saíram (badge "Transferido…" continua).
3. Condomínio simples → nenhum badge de localização aparece (comportamento atual preservado).

## Fora de escopo

- Mudar a aba "Retiradas" (já tem indicação de transferência).
- Adicionar filtro/ordenação por localização.

