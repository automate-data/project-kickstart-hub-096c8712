

## Diagnóstico

A linha "+ N em outros blocos" aparece pra qualquer usuário que enxergue `/packages` em condomínio multi-custódia, inclusive porteiros de bloco (`tower_doorman`) como a Helena.

Para ela, essa informação:
- **Não é relevante** — ela só responde pelo Bloco A
- **Confunde** — sugere que ela teria algo a fazer com pacotes de outros blocos
- **Pode até expor dados** que não interessam ao escopo de bloco

Quem precisa do indicador é apenas a portaria **central** (roles `admin` ou `doorman` sem `location_id` específico), que é quem despachou os pacotes e quer rastrear onde estão.

## Correção

### Regra de exibição

Mostrar a contagem `pendingElsewhereCount` **apenas se** o usuário **não está vinculado a uma location específica de bloco** — ou seja, é portaria central / admin do condomínio.

Critério prático na query do `user_roles` do usuário atual no condomínio selecionado:
- Se existe um role com `location_id IS NOT NULL` (porteiro de bloco) → **esconder** o "+ N em outros blocos"
- Caso contrário (admin, doorman da central) → **mostrar** normalmente

### Bônus de coerência

Como a Helena também não opera a portaria central, vale ocultar a query inteira de `pendingElsewhereCount` (não só o texto) — economiza request e evita qualquer vazamento de contagem cross-bloco.

## Arquivo a alterar

- **`src/pages/Packages.tsx`**
  - Adicionar state `isTowerScopedUser: boolean`
  - Em `useEffect` que busca a central location, fazer query paralela em `user_roles`:
    ```ts
    .eq('user_id', user.id)
    .eq('condominium_id', condominium.id)
    .not('location_id', 'is', null)
    .is('deleted_at', null)
    ```
    Se retornar linha → `setIsTowerScopedUser(true)`
  - Em `fetchCounts`: pular a `elsewhereQuery` quando `isTowerScopedUser === true` (manter `pendingElsewhereCount = 0`)
  - Na renderização: o `{pendingElsewhereCount > 0 && ...}` já cobre o caso, mas adicionar guarda explícita `&& !isTowerScopedUser` por clareza

## Validação manual

1. Login como **Helena** (porteira do Bloco A) → abrir `/packages`
   - Confirmar que **não aparece** "+ N em outros blocos"
   - Confirmar que "Aguardando retirada" continua mostrando os pendentes do escopo dela
2. Login como **admin/portaria central** do mesmo condomínio
   - Confirmar que "+ 3 em outros blocos" continua aparecendo e clicável
3. Login em condomínio simples (sem multi-custódia) → nada muda

## Fora de escopo

- Repensar se `tower_doorman` deveria ter acesso à rota `/packages` (hoje a UX principal dela é `/tower-dashboard`) — pode virar outra iteração
- Aplicar o mesmo filtro nas queries da lista de pacotes (a RLS já restringe ao condomínio; o que ela vê é coerente, só o indicador extra é que era ruidoso)

