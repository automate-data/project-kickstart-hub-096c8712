## Novo modo de custódia: `simple_locker` (Portaria Simples com Armário)

Bloco único. Porteiro recebe → notifica chegada → opcionalmente aloca em armário numerado → segunda notificação → morador retira com assinatura.

---

### 1. Banco de dados (migration)

**`condominiums.custody_mode`**
- Hoje é `text` com default `'simple'` (sem CHECK constraint). Adicionar trigger de validação que aceite `('simple','simple_locker','multi_custody')` (evita CHECK pra não brigar com restore/migrações futuras — segue convenção do projeto).

**`locations`**
- Sem mudança de schema. No modo `simple_locker`:
  - Criar 1 location `type='central'` (portaria) automaticamente no setup.
  - Lockers ficam com `parent_id = central.id` (a coluna já é `uuid` nullable, sem FK de tipo — funciona).
- Sem torres nesse modo.

**`package_events`**
- Sem mudança. Reaproveita o evento de transferência `central → locker` com `notes: "locker_reference:<num>"` (mesma convenção de multi-custody).

---

### 2. Tipos TypeScript

`src/types/index.ts`:
```ts
export type CustodyMode = 'simple' | 'simple_locker' | 'multi_custody';
```

`src/hooks/useCondominium.tsx`: campo `custody_mode` permanece `string` (já é).

---

### 3. Setup wizard (`src/pages/Setup.tsx`)

Adicionar **Step 3 novo (Modo de Operação)** antes do resumo (vira 4 steps):

- Step 3 — RadioGroup com 3 opções: Simples / Simples com Armário / Multi-Custódia.
- Se `simple_locker` selecionado: input "Quantidade de armários" + prefixo opcional (default `Armário`). Gera nomes `Armário 1..N` (editável depois em AdvancedSettings).
- Step 4 — Resumo + Concluir.

No `handleFinish`:
- Insere condominium com `custody_mode` escolhido.
- Se `simple_locker`: cria location central (`name='Portaria'`, `type='central'`) + N lockers com `parent_id = central.id`.
- Se `multi_custody`: comportamento atual (lockers configurados depois).

---

### 4. AdvancedSettings (`src/pages/AdvancedSettings.tsx`)

- Adicionar terceiro RadioGroup: "Portaria Simples com Armário".
- Ao mudar para `simple_locker`: garantir central existente; permitir CRUD de lockers (parent = central, sem dropdown de torre).
- Bloco "Locais Físicos" agora aparece para `multi_custody` **e** `simple_locker`. No modo `simple_locker` o `<Select>` de tipo só mostra `Armário` (central já existe), e oculta o seletor de torre.

---

### 5. Dashboard (`src/pages/Dashboard.tsx`)

- Filtro de pendentes: tratar `simple_locker` igual ao `multi_custody` — só mostra pacotes em `current_location_id = central` (e órfãos legados ficam fora; receber package já grava central).
- Adicionar **modo seleção múltipla** (checkbox em cada card pendente) quando `custody_mode === 'simple_locker'`.
- Botão flutuante "Alocar no armário (N)" abre `LockerDialog` (de `CustodyDialogs.tsx`) — adaptado para receber lista (loop sobre seleção, ou abrir um por um). Decisão: **abrir LockerDialog por pacote** (cada um vai pra um armário diferente) — mais simples e cobre 99% dos casos.
- Após alocar: update `packages.current_location_id`, insert `package_events` (from=central, to=locker, notes=`locker_reference:<num>`), invoke `send-locker-notification` se `whatsapp_enabled`.

---

### 6. ReceivePackage (`src/pages/ReceivePackage.tsx`)

Já busca central quando `multi_custody`. Estender condição: também buscar central quando `simple_locker` e gravar `current_location_id = central.id` no novo pacote.

---

### 7. Packages (`src/pages/Packages.tsx`)

- Substituir `isMultiCustody = custody_mode === 'multi_custody'` por `hasLocations = custody_mode !== 'simple'` em toda lógica de:
  - busca de `centralLocationId`,
  - filtros da query (pendentes na central + órfãos),
  - `getLocationBadge` (renderiza "No Armário — posição X" / "Na Central").
- No modo `simple_locker` **não** existem outras torres → `pendingElsewhereCount` será sempre 0 naturalmente (pacotes só estão em central ou em locker). Pacotes em locker ainda aparecem na aba Aguardando com badge "No Armário".
- Adicionar botão "Alocar no armário" inline em cada card pendente quando `custody_mode === 'simple_locker'` (alternativa à seleção em massa do Dashboard).

---

### 8. Edge function `send-locker-notification`

Hoje a mensagem usa template Twilio `HXfe32e7f4dcfef8eed3e5ef677df35606` com 3 variáveis: `{1}=morador, {2}=torre, {3}=armário`.

No modo `simple_locker` não tem torre. Opções:
- **A (recomendado):** passar `tower_name = "Portaria"` quando `simple_locker`. Frase fica natural: "...no armário X da Portaria". Sem mudança no template, sem reaprovação Twilio.
- B: criar template novo só com 2 variáveis — exige reaprovação WhatsApp (lento).

Vou com **A**. Frontend envia `tower_name: 'Portaria'` quando custody_mode === 'simple_locker'.

---

### 9. AppLayout / navegação

Sem mudança. `simple_locker` não tem rotas de torre (já são exclusivas de `tower_doorman`/`tower_admin` roles, que não existem nesse modo).

---

### 10. Roles

- Reaproveita `admin` + `doorman`. Nada de role novo.
- Doorman vê Dashboard, recebe e aloca em armário.

---

### Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/...` | Trigger validação `custody_mode` |
| `src/types/index.ts` | `CustodyMode` union |
| `src/pages/Setup.tsx` | Novo step de modo + criação de central/lockers |
| `src/pages/AdvancedSettings.tsx` | 3ª opção + CRUD lockers no simple_locker |
| `src/pages/Dashboard.tsx` | Seleção múltipla + botão alocar |
| `src/pages/ReceivePackage.tsx` | Gravar central no simple_locker |
| `src/pages/Packages.tsx` | Generalizar `isMultiCustody` → `hasLocations`, badges |
| `src/components/custody/CustodyDialogs.tsx` | Tornar `towerName` opcional / fallback "Portaria" |

Edge functions: nenhuma alteração de código (frontend manda `tower_name='Portaria'`).

---

### Fora de escopo

- Alocação em lote num único armário (cada pacote vai pra um locker individual).
- Migrar condomínios `simple` existentes para `simple_locker` automaticamente (admin escolhe manualmente em AdvancedSettings).
- Template WhatsApp dedicado sem menção a torre (fica como melhoria futura).
- Relatórios específicos de uso de armário (Reports continua agnóstico).
