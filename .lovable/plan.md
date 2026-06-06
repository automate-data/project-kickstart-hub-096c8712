
# Notificação única na retirada em lote

## Problema
Hoje o `handleConfirmBatchPickup` chama `send-pickup-confirmation` uma vez **por encomenda**. Como o template atual só informa "confirmamos a retirada da sua encomenda" + data/hora (sem detalhes individuais), o morador recebe N mensagens idênticas — ruído puro e custo Twilio multiplicado.

## Mudança (somente no fluxo de lote)
Em `src/pages/Packages.tsx`, dentro de `handleConfirmBatchPickup`:

1. Após o `UPDATE` em massa bem-sucedido, disparar **uma única** chamada `supabase.functions.invoke('send-pickup-confirmation', ...)` usando os dados do primeiro pacote do lote (mesmo `resident`, `phone`, `picked_up_at`, `condominium_id`).
   - `package_id` enviado: o do primeiro pacote (apenas para fins de log; o template não cita encomenda específica).
2. Atualizar `pickup_confirmation_sent = true` em **todos** os pacotes do lote (um único `UPDATE ... IN (ids)`) quando a chamada retornar sucesso. Em caso de falha, nenhum recebe `true` (mantém comportamento atual de retry implícito).
3. Continuar com `insertLog('package_picked_up', ...)` por pacote (rastreabilidade individual permanece).
4. `queryClient.invalidateQueries(['packages'])` + `fetchCounts()` ao final, igual hoje.

## O que NÃO muda
- Retirada individual (`PickupDialog` + `handleConfirmPickup`): continua 1 notificação por encomenda, como sempre foi.
- Edge function `send-pickup-confirmation`, template Twilio, RLS, schema, logs.
- Lógica de assinatura, soft-delete, transferências, lockers, OCR.

## Resultado
Morador recebe **1 mensagem** ao retirar N encomendas em lote, com o mesmo template aprovado. Custo Twilio cai de N→1 por lote e UX no WhatsApp fica limpo.
