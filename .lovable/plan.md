# Retirada em lote por morador

## Objetivo
Permitir que o porteiro selecione várias encomendas pendentes do **mesmo morador** e finalize a retirada com **uma única assinatura**, sem alterar a lógica atual de retirada individual nem nenhum fluxo já em produção (recebimento, transferências, lockers, notificações).

## Escopo (somente UI + chamadas já existentes)
- Tela afetada: `src/pages/Packages.tsx` (aba "Aguardando").
- Novo componente: `src/components/BatchPickupDialog.tsx` (variação do `PickupDialog` para múltiplos pacotes).
- **Sem mudanças** em banco, RLS, triggers, Edge Functions, tipos ou no `PickupDialog` atual.

## Comportamento

### 1. Agrupamento visual na aba "Aguardando"
- Quando houver 2+ encomendas pendentes do mesmo `resident_id`, agrupar visualmente sob o nome do morador com um cabeçalho contendo:
  - Nome + Bloco/Apto
  - Badge `N encomendas`
  - Botão **"Retirar todas"** (abre `BatchPickupDialog` com todos os pacotes do grupo)
- Encomendas únicas (morador com 1 pacote) e pacotes com `resident_id NULL` continuam exibidas como hoje, com botão "Retirar" individual.
- Cards continuam clicáveis individualmente; cada card mantém um **checkbox** opcional para seleção manual de um subconjunto.

### 2. Seleção manual (subconjunto)
- Ao marcar checkboxes em cards do **mesmo morador**, surge uma **barra de ação fixa** no rodapé:
  - `N selecionadas — [Nome do morador]`
  - Botões: **Limpar** | **Retirar selecionadas**
- Restrições:
  - Seleção só funciona dentro de encomendas pendentes do mesmo morador. Tentar marcar pacote de outro morador exibe toast `Selecione encomendas de um único morador` e ignora o clique.
  - Pacotes sem morador (`resident_id NULL`) não são selecionáveis em lote — só retirada individual.
  - Em modo `simple_locker`/`multi_custody`, lote só é permitido entre pacotes com o **mesmo `current_location_id`** (não misturar armário com central). Caso contrário, toast equivalente.

### 3. `BatchPickupDialog`
Espelha o `PickupDialog` atual, mas recebe `packages: Package[]`:
- Cabeçalho: "Confirmar retirada de N encomendas"
- Resumo do morador (nome + unidade)
- Lista compacta com miniatura + transportadora + horário de cada pacote (ScrollArea, mesmo padrão do `TransferDialog`)
- Canvas único de assinatura (`SignatureCanvas`)
- Botão único **"Confirmar retirada de N encomendas"**

### 4. Persistência
Reaproveita a lógica existente do `handleConfirmPickup`, executada em loop sobre o array:
- `UPDATE packages SET status='picked_up', picked_up_at, picked_up_by, signature_data` — mesma assinatura aplicada a todos.
- `insertLog('package_picked_up', package_id)` por pacote.
- WhatsApp: **uma chamada** `send-pickup-confirmation` por pacote (mantém comportamento atual e contagem por encomenda), envolvida em `Promise.allSettled` para não bloquear se algum falhar.
- `pickup_confirmation_sent` atualizado individualmente conforme cada chamada.
- `queryClient.invalidateQueries(['packages'])` + `fetchCounts()` ao final.
- Estados de erro: se algum `UPDATE` falhar, toast com `X de N concluídas` e mantém pendentes os que falharam.

### 5. Estados visuais
- Card em modo seleção: borda `border-primary/40` + checkbox visível.
- Cabeçalho de grupo: card sutilmente recolhido com avatar/iniciais do morador.
- Barra de ação fixa: `sticky bottom-0`, sombra superior, respeita safe-area mobile.
- Loading no dialog: spinner + texto `Registrando N retiradas...`.

## O que NÃO muda
- `PickupDialog` original permanece intacto e ainda é usado para retirada individual.
- Nenhuma alteração em recebimento (`/receive`), transferências, lockers, edge functions, RLS, schema.
- Notificações WhatsApp continuam 1:1 por encomenda (mesma tarifa e template já aprovados).
- Histórico/assinatura: cada pacote armazena a mesma `signature_data` (string base64), preservando rastreabilidade individual.

## Resultado esperado
Porteiro retira 9 encomendas do mesmo morador em **1 assinatura + 1 clique**, em vez de 9 ciclos de diálogo. Operações grandes ficam viáveis sem alterar nada do que já roda em produção.
