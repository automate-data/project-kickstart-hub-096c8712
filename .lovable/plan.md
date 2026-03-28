

## Plano: Custos Twilio por Condomínio via Messages API

### Contexto
A Usage Records API do Twilio retorna totais agregados sem separação por número de destino. Para separar custos por condomínio, usaremos a **Messages API** (`GET /Messages.json`) que retorna cada mensagem individual com `To`, `Price` e `DateSent`.

### Como funciona o cruzamento

```text
Twilio Messages API (GET /Messages.json)
  → Lista mensagens: { To: "whatsapp:+5511999...", Price: "-0.0050", ... }

residents (banco de dados)
  → { phone: "+5511999...", condominium_id: "abc-123" }

Cruzamento: normalizar número → buscar resident → agrupar por condominium_id
```

### Alterações

**1. Atualizar edge function `supabase/functions/twilio-usage/index.ts`**
- Adicionar novo modo: quando receber `breakdown: true` no body, buscar mensagens individuais via `GET /Messages.json` com paginação
- Parâmetros: `DateSent>=startDate`, `DateSent<=endDate`, `From=whatsapp:+5511979684575`
- Cada mensagem retorna: `to`, `price`, `date_sent`, `status`
- Usar service role client para buscar tabela `residents` (phone + condominium_id) e montar mapa `phone → condominium_id`
- Normalizar números (remover `whatsapp:`, garantir formato E.164) para cruzamento
- Agrupar custos reais por `condominium_id`
- Retornar: `{ perCondominium: { [condId]: { count, price } }, unmatched: { count, price } }`
- Manter o modo atual (Usage Records) como default para o custo total geral
- Limitar paginação (safety limit de 20 páginas = 20.000 mensagens)

**2. Atualizar `src/pages/SuperAdmin.tsx`**
- Nova query para invocar `twilio-usage` com `breakdown: true`
- Substituir `condCosts` WhatsApp estimados por custos reais do Twilio por condomínio
- Na tabela "Visão por Condomínio", coluna "Custo Est." passa a mostrar custo real do WhatsApp + estimativa IA + cloud
- Adicionar indicador para mensagens sem match (números não cadastrados)
- Badge "Real" vs "Estimativa" por condomínio

### Considerações
- A Messages API retorna campo `price` (negativo) por mensagem — usaremos `Math.abs()`
- Mensagens para números não encontrados na tabela `residents` ficam em categoria "não identificado"
- O campo `phone` dos residents precisa normalização para comparação (remover espaços, parênteses, garantir +55)
- A query de residents usa service role (na edge function) para acessar todos os condomínios

### Sem alterações de banco de dados
Nenhuma migration necessária.

