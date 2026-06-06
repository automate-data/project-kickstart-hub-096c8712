# Dois ajustes no fluxo de encomendas

## 1) Alocou no armário → fluxo encerrado

Hoje, no modo `multi_custody`, alocar uma encomenda no armário só move a localização. A encomenda continua "Aguardando retirada" e mostra o botão **Retirar** (com assinatura), como na imagem.

A regra "armário = fim do fluxo" passa a valer para **todos os modos** (multi_custody e simple_locker):

- Ao alocar no armário (individual ou em lote), o sistema marca automaticamente como `picked_up`:
  - `status = 'picked_up'`
  - `picked_up_at = now()`
  - `picked_up_by = 'Armário <ref>'`
  - `signature_data = null` (sem assinatura falsa)
- A encomenda sai de **Aguardando** e vai para **Retiradas** imediatamente.
- O morador recebe **uma única** notificação WhatsApp informando o número do armário (comportamento já existente).
- O evento `package_allocated_to_locker` continua sendo registrado.
- O botão **Retirar** deixa de aparecer para encomendas já em armário (defesa adicional caso reste algum item legado nesse estado).

## 2) Retirada em lote por apartamento (não por morador)

Hoje o agrupamento usa `resident_id + current_location_id`. Encomendas de moradores diferentes que dividem o mesmo apto (ex.: marido e esposa em A/53) ficam em grupos separados.

Mudança:

- A chave de agrupamento passa a ser **`block + apartment + current_location_id`**.
- O cabeçalho do grupo (faixa azul "Retirar todas") passa a mostrar o apartamento (ex.: `A/53 — 2 encomendas`) em vez de um único nome.
- Seleção manual via checkbox passa a permitir múltiplos moradores do mesmo apto/local. Mensagem de erro atualizada: "Selecione encomendas do mesmo apartamento e local."
- Diálogo de confirmação de retirada em lote (`BatchPickupDialog`):
  - Cabeçalho mostra o apartamento.
  - Lista por linha mostra nome do morador de cada encomenda (já mostra hoje).
  - Texto da assinatura: "Assinatura de quem está retirando" (sem assumir um nome só).
- Notificação WhatsApp de confirmação: envia **uma mensagem por morador distinto** presente no lote (ex.: 1 para o marido se as 2 encomendas dele saíram, 1 para a esposa se houver encomenda dela), respeitando `whatsapp_enabled` de cada um.

## Detalhes técnicos

Arquivos afetados:

- `src/pages/Packages.tsx`
  - `getGroupKey`: usar `block|apartment` no lugar de `resident_id`.
  - `toggleSelect`: ajustar mensagens.
  - `handleConfirmAllocation` / `handleConfirmBatchAllocation`: marcar `picked_up` + `picked_up_at` + `picked_up_by`.
  - `handleConfirmBatchPickup`: agrupar moradores distintos do lote e disparar um `send-pickup-confirmation` por morador.
  - `PackageCard`: esconder botão Retirar quando `current_location_id` for de um locker.
- `src/pages/Dashboard.tsx`
  - `handleConfirmAllocation`: mesma marcação `picked_up`.
- `src/components/BatchPickupDialog.tsx`
  - Cabeçalho/labels para apartamento em vez de morador único.
- Sem mudanças de schema, edge functions ou templates Twilio.

## O que NÃO muda

- Recebimento de encomendas (OCR), transferências entre torres/armários, retirada individual fora do armário.
- Templates do WhatsApp (segue usando o template singular aprovado).
