

## Ajustes em Encomendas, Tempo de Permanencia e Controle de Notificacoes

### 1. Big numbers em /packages

Adicionar dois cards de contagem acima das tabs:
- **Aguardando**: total de encomendas pendentes (query separada, sem filtro de data)
- **Retiradas hoje**: contagem de encomendas retiradas no dia atual (`picked_up_at >= inicio do dia`)

Ambos sao buscados com queries count independentes do filtro de tab ativo, exibidos como cards com numero grande e label pequeno.

### 2. Tempo de permanencia em cada pacote

No `PackageCard`, para encomendas pendentes, exibir o tempo desde `received_at` de forma explicita (ex: "Na portaria ha 2 dias" ou "Ha 3 horas"). Usar `formatDistanceToNow` que ja esta importado. Para retiradas, mostrar quanto tempo ficou na portaria (diferenca entre `picked_up_at` e `received_at`).

### 3. Toggle de notificacao por morador

**Database**: Adicionar coluna `whatsapp_enabled` (boolean, default true) na tabela `residents`.

**UI em /residents**: Adicionar um Switch ao lado de cada morador para ligar/desligar notificacoes. Apenas admins verao o switch. Ao alterar, faz update direto na tabela.

**Alerta ao porteiro em /receive-package**: Quando o porteiro selecionar um morador com `whatsapp_enabled = false`, exibir um alerta visivel: "Notificacao desligada para este morador. Comunique a chegada da encomenda pessoalmente ou por interfone."

**Logica de envio**: Em `ReceivePackage.tsx`, verificar `selectedResident.whatsapp_enabled` antes de chamar `send-whatsapp`. Se false, nao envia.

### Detalhes tecnicos

**Migracao SQL:**
```sql
ALTER TABLE public.residents ADD COLUMN whatsapp_enabled boolean NOT NULL DEFAULT true;
```

**Arquivos modificados:**
- `src/types/index.ts` -- adicionar `whatsapp_enabled: boolean` ao tipo `Resident`
- `src/pages/Packages.tsx` -- adicionar cards de contagem (pendingCount, pickedUpTodayCount) e tempo de permanencia nos cards
- `src/pages/Residents.tsx` -- adicionar Switch por morador (visivel para admins) com update no banco
- `src/pages/ReceivePackage.tsx` -- condicionar envio de WhatsApp ao `whatsapp_enabled` e exibir alerta quando desligado

