## Problema

Hoje, quando uma encomenda é alocada em armário pelo porteiro da torre:

1. A encomenda continua com `status = 'pending'` no banco.
2. O morador recebe WhatsApp informando o número do armário.
3. Em algum momento (às vezes no dia seguinte), o porteiro vê o armário vazio, deduz que o morador retirou e clica em "Confirmar retirada" — assinando **no lugar do morador** (fluxo `confirmLockerPickup` em `TowerDashboard.tsx`).
4. Isso dispara um **segundo** WhatsApp ("confirmamos sua retirada") com timestamp errado, gerando reclamações.

A assinatura é fictícia (porteiro assina por morador ausente) e a confirmação de retirada não tem valor real — o "comprovante" verdadeiro é a alocação no armário.

## Nova dinâmica

**Alocação em armário = ponto final do fluxo.** O morador recebe uma única mensagem ("sua encomenda está no armário X") e a encomenda já é considerada entregue. Sem assinatura fictícia, sem segundo WhatsApp.

## Mudanças

### 1. `src/pages/TowerDashboard.tsx` — `handleLockerConfirm`

Logo após inserir o `package_event` de transferência para o armário, atualizar o próprio `packages`:

- `status = 'picked_up'`
- `picked_up_at = now()` (mesmo timestamp da alocação)
- `picked_up_by = 'Armário <ref>'` (rastreia que foi via armário, não via balcão)
- `pickup_confirmation_sent = true` (a mensagem do armário já é a confirmação — bloqueia qualquer reenvio)
- **Sem `signature_data`** (nulo intencional, distingue de retirada presencial)

A mensagem `send-locker-notification` continua igual (template aprovado, fala do número do armário). Nada de `send-pickup-confirmation` no fluxo de armário.

### 2. Botão "Confirmar Retirada" no card da encomenda em armário

Manter como **opção administrativa**, escondida por padrão:

- Como a encomenda agora já está `picked_up` ao ser alocada, ela **some naturalmente** da lista de pendentes — o botão não aparece mais no fluxo normal.
- Para casos de correção (morador devolveu, encomenda errada), a reabertura/edição passa a ser feita via Detalhes da encomenda (já existente) ou via `/advanced-settings`. Sem fluxo dedicado de "confirmar retirada de armário".
- Removemos `confirmLockerPickup`, `lockerPickupTarget`, `lockerPickupLoading` e o `AlertDialog` correspondente do `TowerDashboard.tsx`.

### 3. Listagem na `TowerDashboard`

Hoje a tela mostra "No Armário — posição X" misturado com pendentes. Após a mudança:

- A query principal filtra `status = 'pending'`, então encomendas alocadas saem da lista automaticamente.
- A métrica do topo `lockerCount` deixa de fazer sentido como "no armário aguardando" — substituir por contador de **alocadas hoje** (query separada: `picked_up_by ILIKE 'Armário%'` no dia atual) ou remover o card. Decisão: **remover o split visual** e mostrar apenas o contador único de pendentes (blocos). Locker vira histórico.

### 4. Histórico / Relatórios

Em `Reports.tsx` e listas de "retiradas", encomendas alocadas em armário aparecem como retiradas normais. O campo `picked_up_by = 'Armário X'` permite distinguir visualmente quando útil (badge "Armário" em vez de assinatura). Plano: adicionar um pequeno badge "Armário" nos cards de histórico quando `picked_up_by` começar com "Armário" e `signature_data` for null. Não-bloqueante; pode ser feito num segundo passo.

### 5. Edge function `send-pickup-confirmation`

**Nenhuma alteração.** Continua existindo para retirada presencial individual e em lote. Apenas deixa de ser chamada no fluxo de armário.

### 6. Nota sobre múltiplos pacotes no armário

Hoje o `LockerDialog` aceita **apenas 1 pacote por vez**. Se o porteiro alocar 5 pacotes do mesmo morador no armário, ele precisa abrir o diálogo 5 vezes e o morador recebe **5 mensagens de armário** — ruído puro. Este plano não resolve o batch de alocação em armário; resolveremos isso em um segundo passo caso se confirme que o volume justifica. Por ora, cada alocação individual já encerra o fluxo daquela encomenda (sem segundo WhatsApp de retirada), o que já resolve o problema principal relatado.

## O que NÃO muda

- Retirada presencial (balcão central): assinatura + WhatsApp de confirmação seguem iguais.
- Retirada em lote (multi-encomendas presencial): inalterada.
- Template Twilio do armário (`HXfe32e7f4dcfef8eed3e5ef677df35606`): inalterado.
- Schema do banco: nenhuma migration. Só usamos colunas que já existem (`status`, `picked_up_at`, `picked_up_by`, `pickup_confirmation_sent`).
- `package_events` continua sendo a fonte da verdade para "quem alocou em qual armário e quando".
- RLS, soft-delete, isolamento por condomínio.

## Resultado

- Morador recebe **1 mensagem** por alocação ("encomenda no armário X") e nada mais.
- Porteiro não precisa mais voltar ao sistema para "confirmar retirada" de encomendas em armário.
- Acaba a assinatura fictícia em nome do morador.
- Acaba o WhatsApp tardio de "confirmamos sua retirada" gerando estranheza.
- Histórico mantém rastreabilidade (`picked_up_by = 'Armário X'`, `package_events` registra a transferência).