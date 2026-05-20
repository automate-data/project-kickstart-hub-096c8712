# Exigir morador identificado no recebimento

## Problema
No fluxo de **Receber encomenda** (`src/pages/ReceivePackage.tsx`), o botão "Confirmar recebimento" hoje só verifica `isSaving`. Se a IA não identificar o morador e o porteiro não selecionar um na lista, o pacote é gravado com `resident_id = NULL` — exatamente o que aconteceu no registro `d70317b2-...`, sem rastreabilidade.

## Mudança proposta (somente UI)
Bloquear a confirmação enquanto **não houver morador selecionado**.

### Em `src/pages/ReceivePackage.tsx`

1. **Desabilitar o botão** quando `selectedResident` for `null`:
   ```tsx
   disabled={isSaving || !selectedResident}
   ```

2. **Aviso visual** logo abaixo do seletor de morador quando nenhum estiver selecionado (após a etapa de processamento da IA), no mesmo estilo do alerta de WhatsApp desligado:
   - Ícone de alerta + texto curto:
     "Selecione o morador para confirmar o recebimento. Se o destinatário não estiver cadastrado, cadastre-o em Moradores antes de continuar."

3. **Destaque do seletor** quando vazio após a IA rodar: borda `border-destructive/50` no `PopoverTrigger` enquanto `selectedResident` for `null` e `step === 'confirm'`. Isso direciona o olhar do porteiro.

4. **Guard extra no `handleSubmit`**: early-return com toast de erro se `!selectedResident`, para proteger contra qualquer caminho que escape do disabled.

## O que NÃO muda
- Sem alterações de banco, RLS, triggers ou Edge Functions.
- Fluxo de OCR/IA continua igual — apenas a confirmação manual exige escolha explícita.
- Pacotes antigos com `resident_id NULL` não são afetados.
- Retirada (`PickupDialog`) não é alterada nesta tarefa.

## Resultado esperado
Impossível registrar um novo pacote sem vincular a um morador cadastrado, eliminando a classe de problema do pacote `d70317b2-...`.
