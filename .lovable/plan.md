# Encomendas alocadas em armário devem permanecer em "Aguardando" (modo Portaria + Armário)

## Problema

No modo **Portaria Simples com Armário** (`simple_locker`), quando a portaria aloca uma encomenda em um armário, ela some da aba **Aguardando** e aparece na aba **Retiradas** com um botão "Retirar". Isso está incorreto — a encomenda ainda não foi retirada pelo morador, ela apenas mudou de localização (Central → Armário).

O comportamento correto (igual ao modo **Multi-custódia**) é:
- A encomenda continua na aba **Aguardando**
- Mostra o badge **"No Armário — posição X"** (já implementado em `getLocationBadge`)
- O botão **"Retirar"** continua ali para confirmação de retirada com assinatura
- O botão **"Alocar"** desaparece (já está alocada)
- Aparece em **Retiradas** apenas quando `status = 'picked_up'`

## O que mudar

Arquivo único: **`src/pages/Packages.tsx`**

### 1. Query de listagem (`fetchPackagesPage`, linhas ~65-77)

Hoje, quando há `centralLocationId`, o filtro de `picked_up` inclui pacotes pendentes fora da central — isso foi pensado para multi-custódia (transferidos para torres). Em `simple_locker` esse mesmo filtro varre os armários e os puxa para "Retiradas".

Adicionar um parâmetro `isSimpleLocker` ao `fetchPackagesPage` e:
- **Aguardando**: incluir pendentes na central, órfãos **e** pendentes em armários (qualquer `current_location_id`, desde que `status = 'pending'`).
- **Retiradas**: usar apenas `status.eq.picked_up` (sem o `or` que pega pendentes fora da central).

### 2. Contadores (`fetchCounts`, linhas ~192-237)

Mesma lógica:
- `pendingCount` em simple_locker = todas as pendentes do condomínio (sem filtrar por `current_location_id`).
- `pickedUpTodayCount` em simple_locker = apenas `status='picked_up'` no dia (sem o ramo "transferidas hoje").
- `pendingElsewhereCount` permanece 0 em simple_locker (já está oculto na UI).

### 3. PackageCard (linhas ~457-552)

- `isTransferredAway` deve ser **false** em simple_locker (não existe "transferência" para outro local de custódia, só alocação em armário, que mantém a encomenda em aguardando). Adicionar `&& !isSimpleLocker` no cálculo.
- Resultado automático: o botão "Retirar" continua aparecendo para encomendas em armário, e o botão "Alocar" some (a condição `currentLocId === centralLocationId` já trata isso).
- O badge "No Armário — posição X" já é renderizado por `getLocationBadge` quando há um evento com `to_location.type === 'locker'`.

## Resultado esperado

Em **Portaria Simples com Armário**:

| Estado da encomenda | Aba | Badge | Botões |
|---|---|---|---|
| Recém recebida (na central) | Aguardando | — | Alocar, Retirar |
| Alocada em armário (pendente) | **Aguardando** | **No Armário — posição X** | Retirar |
| Retirada pelo morador | Retiradas | Retirada pelo morador | — (clicável p/ detalhes) |

Idêntico ao comportamento já existente em multi-custódia, exceto que não há transferências entre torres.