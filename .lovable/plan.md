

## Plano: Atualizar Custo por Mensagem WhatsApp e Simplificar Painel

### Contexto
O custo real por mensagem WhatsApp é **US$ 0,0118** (Twilio US$ 0,0050 + Meta WhatsApp Utility BR US$ 0,0068), não apenas US$ 0,0068. Vamos atualizar o valor fixo, remover a edge function `twilio-usage` (não mais necessária), e simplificar o painel para usar custos fixos com separação por condomínio via `system_logs`.

### Composição do Custo (referência)
```text
Twilio (Taxa de saída):       US$ 0,0050
Meta (WhatsApp Utility - BR): US$ 0,0068
TOTAL POR MENSAGEM:           US$ 0,0118
```

### Alterações

**1. Deletar `supabase/functions/twilio-usage/index.ts`**
- Remover a edge function inteira — custos serão calculados por custo fixo.

**2. Atualizar `src/pages/SuperAdmin.tsx`**
- Alterar constante `WHATSAPP_COST_PER_MSG` de `0.0068` para `0.0118`
- Remover a query `sa-twilio-usage` e variáveis relacionadas (`twilioUsage`, `hasTwilioData`, `twilioLoading`, etc.)
- Remover lógica condicional "real vs estimativa" nos CostCards
- Simplificar cards de custo para usar apenas o cálculo baseado em `system_logs` (contagem de `whatsapp_sent` × $0.0118)
- A separação por condomínio já funciona via `condCosts` usando `condominium_id` dos logs

**3. Atualizar `.lovable/plan.md`**
- Refletir a nova abordagem de custo fixo com a composição correta do valor

### Sem alterações de banco de dados
Nenhuma migration necessária.

