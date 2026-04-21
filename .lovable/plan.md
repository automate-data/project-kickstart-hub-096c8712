

## Diagnóstico

Em `/packages` no condomínio multi-custódia "Solar dos Pinheiros", a aba **Aguardando** mostra zero, mas o banco tem pendentes:

- **3 pacotes** `pending` com `current_location_id = Bloco A` (foram transferidos da Portaria pro Bloco via `TowerCollect`)
- **3 pacotes** `pending` com `current_location_id = null` (legado, criados sem central)

A query atual filtra `current_location_id = centralLocationId`, então:
1. Pendentes transferidos para blocos somem da aba "Aguardando" ✅ (correto — não estão mais na minha custódia)
2. Pendentes com `current_location_id = null` somem completamente ❌ (bug — ficam órfãos)
3. Usuária não tem visibilidade de que existem pendentes no condomínio fora da central ❌ (problema de UX)

## Correção proposta

### 1. Pacotes órfãos (`current_location_id IS NULL`)
Tratá-los como se estivessem na central — incluir no filtro de "Aguardando":
```ts
.or(`current_location_id.eq.${centralLocationId},current_location_id.is.null`)
```
Aplicar tanto na query da lista quanto no `pendingCount`.

### 2. Visibilidade dos pendentes em outras locations
O cartão grande "Aguardando retirada" hoje só conta os da central. Vou:
- **Manter** o número grande mostrando só pendentes na central (é a fila de ação do porteiro)
- **Adicionar logo abaixo** uma linha pequena: "*+ N pendentes em outros blocos*" quando houver `pending` fora da central, clicável para abrir a aba "Retiradas" (que já lista os transferidos com badge azul "Transferido para Bloco X")

Assim o porteiro central vê de relance quantas encomendas ainda estão circulando no condomínio, sem confundir com a sua fila pessoal de retirada.

### 3. Indicador na aba "Retiradas"
Já existe a regra que inclui transferidos. Vou validar que os 3 pacotes do Bloco A aparecem lá com badge "Transferido para Bloco A".

## Arquivos a alterar

- **`src/pages/Packages.tsx`**
  - `fetchPackagesPage`: `status === 'pending'` passa a aceitar `current_location_id = central OR null`
  - `fetchCounts`: `pendingQuery` aplica o mesmo OR
  - Adicionar segunda contagem `pendingElsewhereCount` (pendentes do condomínio que NÃO estão na central nem null)
  - Renderizar a linha "*+ N em outros blocos*" abaixo do número grande quando > 0, com onClick que troca para aba "Retiradas"

## Validação manual

1. Login como portaria central do Solar dos Pinheiros
2. Confirmar:
   - "Aguardando retirada" passa a contar os 3 pacotes órfãos (NULL) + qualquer pendente atual da central
   - Aparece "*+ 3 em outros blocos*" abaixo (referente aos pendentes no Bloco A)
   - Clicando em "Retiradas", os 3 do Bloco A aparecem com badge "Transferido para Bloco A"
3. Receber novo pacote → confirmar que entra em "Aguardando" normalmente
4. Login como condomínio simples (sem multi-custódia) → confirmar que nada quebrou

## Fora de escopo

- Migrar pacotes legados com `current_location_id = NULL` para apontar pra central (pode ser feito em outra iteração via SQL one-shot)
- Mudar regra de transferência em lote

