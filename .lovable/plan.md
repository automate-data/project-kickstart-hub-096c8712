## Objetivo

Quando o porteiro aloca **mais de um pacote** do mesmo apartamento em um armário (fluxo em lote em `Packages.tsx`), enviar UMA notificação WhatsApp consolidada usando o novo template Twilio aprovado:

- **ContentSid:** `HXf06ac69beecaa15d02e6543c77a4c954`
- **Texto:** `Olá {{1}}! Suas {{2}} encomendas estão disponíveis no armário {{3}} do {{4}}. Retire quando preferir.`
- Variáveis: `1`=nome do morador, `2`=quantidade, `3`=referência do armário, `4`=bloco

O fluxo de **1 pacote** continua usando o template atual (`HXfe32e7f4dcfef8eed3e5ef677df35606`) — nenhuma mudança.

## Mudanças

### 1. Nova Edge Function `send-locker-batch-notification`

Arquivo: `supabase/functions/send-locker-batch-notification/index.ts`

- Copia a estrutura de `send-locker-notification` (CORS, normalização E.164 +55, Twilio Basic Auth).
- Payload aceito:
  ```json
  {
    "resident_phone": "+55...",
    "resident_name": "Paulo da Silva",
    "package_count": 3,
    "locker_reference": "2",
    "tower_name": "Bloco A"
  }
  ```
- `ContentSid`: `HXf06ac69beecaa15d02e6543c77a4c954`
- `ContentVariables`:
  ```json
  { "1": resident_name, "2": String(package_count), "3": locker_reference, "4": tower_name }
  ```
- Registrar em `supabase/config.toml` (a função é pública como as outras de Twilio: sem `verify_jwt`).
- Implantar via `supabase--deploy_edge_functions`.

### 2. `src/pages/Packages.tsx` — `handleConfirmBatchAllocation`

Substituir o bloco que invoca `send-locker-notification` (linhas ~690-704):

- Se `ids.length > 1` → invocar `send-locker-batch-notification` com `package_count: ids.length` e `tower_name: firstPkg.resident?.block || 'Bloco'`.
- Se `ids.length === 1` → manter o template individual atual (`send-locker-notification`), também passando `tower_name: firstPkg.resident?.block || 'Bloco'` em vez do hardcoded `"Bloco"`.

Nenhuma outra alteração de fluxo, banco ou UI. `Dashboard.tsx` e `TowerDashboard.tsx` (alocação individual) permanecem inalterados.

## Não incluído

- Sem mudanças no schema, RLS, ou na lógica de eventos/auditoria.
- Sem mudanças na UI de alocação.
- Sem mudanças no template individual existente.
