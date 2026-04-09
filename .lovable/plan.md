

## Plano: Usar template de confirmação de retirada do armário

### O que muda

**1. Edge Function `send-pickup-confirmation/index.ts`**
- Aceitar novo parâmetro `locker_reference` no body da requisição
- Quando `locker_reference` estiver presente, usar o ContentSid do template de armário (`HXbc5c4ecef860c73987e24a09c8392275`) com 2 variáveis: `{{1}}` = nome do morador, `{{2}}` = referência do armário
- Quando `locker_reference` NÃO estiver presente, manter o ContentSid atual (`HXfd32c526e2f3c8209d014dd2c2f27120`) com as variáveis existentes (nome + data/hora)
- Atualizar o log context para distinguir `"pickup_confirmation"` vs `"locker_pickup_confirmation"`

**2. Frontend `src/pages/TowerDashboard.tsx`**
- No `handleLockerPickup`, adicionar `locker_reference: pkg.locker_reference` ao body enviado para a Edge Function

### Detalhes técnicos

```text
Edge Function — lógica condicional:

if (locker_reference) {
  ContentSid = "HXbc5c4ecef860c73987e24a09c8392275"
  contentVariables = { "1": resident_name, "2": locker_reference }
} else {
  ContentSid = "HXfd32c526e2f3c8209d014dd2c2f27120"
  contentVariables = { "1": resident_name, "2": dateTimeBR }
}
```

Arquivos modificados:
- `supabase/functions/send-pickup-confirmation/index.ts`
- `src/pages/TowerDashboard.tsx` (1 linha — adicionar `locker_reference` ao body)

