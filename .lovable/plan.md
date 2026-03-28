

## Plano: Custos Reais do Twilio no Painel Super Admin

### Contexto
Atualmente os custos de WhatsApp no `/superadmin` são estimativas fixas ($0.0068/msg). O objetivo é buscar os custos reais da API do Twilio e exibi-los no painel.

### Abordagem

O sistema já usa credenciais Twilio diretamente (Account SID + Auth Token) na edge function `send-whatsapp`. Vamos seguir o mesmo padrão para buscar dados de uso.

### Arquitetura

```text
SuperAdmin (frontend)
  → supabase.functions.invoke('twilio-usage')
    → Twilio Usage Records API
      → Retorna custos reais por período
```

### Alterações

**1. Nova Edge Function: `supabase/functions/twilio-usage/index.ts`**
- Recebe parâmetros: `startDate`, `endDate` (período)
- Valida que o chamador é superadmin (via `getClaims` + verificação de email)
- Chama a API Twilio: `GET /2010-04-01/Accounts/{SID}/Usage/Records.json`
  - Parâmetros: `Category=sms`, `StartDate`, `EndDate`
  - Também busca `Category=whatsapp` (Twilio separa por categoria)
- Retorna: custo total, quantidade de mensagens, breakdown por categoria
- Usa as credenciais existentes (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)

**2. Atualizar `src/pages/SuperAdmin.tsx`**
- Adicionar query `useQuery` para invocar `twilio-usage` com o período selecionado
- Substituir os CostCards de WhatsApp estimados por dados reais da API
- Manter fallback para estimativa caso a API falhe
- Adicionar indicador visual "Dados reais" vs "Estimativa"
- Mostrar breakdown: custo unitário médio, total de mensagens, custo total

**3. Detalhes da API Twilio Usage Records**
- Endpoint: `GET /Usage/Records/Daily.json` ou `/Usage/Records.json`
- Filtros: `Category`, `StartDate`, `EndDate`
- Resposta inclui: `count`, `price`, `price_unit`, `usage`
- Categorias relevantes: `whatsapp`, `whatsapp-outbound`

### Segurança
- A edge function valida que apenas o superadmin (`contato@automatedata.com.br`) pode acessar
- Credenciais Twilio já existem como secrets no projeto

### Sem alterações de banco de dados
Nenhuma migration necessária.

