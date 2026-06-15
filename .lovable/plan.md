Ajustar a apresentação do `PackageDetailsDialog.tsx` para refletir corretamente as retiradas realizadas por armário inteligente, que não exigem assinatura.

1. **Contexto**
   - O sistema possui retiradas via armário (torre/locker). Nesses casos, o morador retira a encomenda usando o código enviado por WhatsApp, e a operação de retirada é registrada sem assinatura digital.
   - Hoje, quando o entregador abre o detalhe da encomenda, a caixa de "Assinatura de retirada" exibe "Nenhuma assinatura registrada", criando a impressão de que algo falhou.
   - A origem dos dados é o campo `picked_up_by`, que para retiradas por armário contém algo como "Armário 09", "Armário 18", etc.

2. **O que mudar**
   - Em `src/components/PackageDetailsDialog.tsx`, detectar retirada por armário quando `pkg.status === 'picked_up'` e `pkg.picked_up_by` começar com `"Armário "`.
   - Substituir o bloco atual "Assinatura de retirada / Nenhuma assinatura registrada" por um card informativo:
     - Ícone: `Lock` (lucide-react) no lugar de `PenTool`.
     - Título: **"Retirada via armário"**.
     - Texto: **"Pacote alocado no {picked_up_by}. A confirmação foi enviada ao morador por WhatsApp — não há assinatura para este tipo de retirada."**
   - Preservar o fluxo atual para retiradas presenciais (com assinatura) e transferências (com assinatura do receptor).

3. **O que não muda**
   - Nenhuma alteração no backend, no fluxo de retirada do `TowerDashboard` ou na geração de códigos de armário.
   - Apenas ajuste de apresentação no diálogo de detalhes da encomenda.

```text
+--------------------------------+
|  PackageDetailsDialog          |
|  -----------------------------|
|  ... campos da encomenda ...   |
|                                |
|  SE retirada por armário:      |
|  [Lock] Retirada via armário   |
|  Pacote alocado no Armário 09. |
|  Confirmação enviada por       |
|  WhatsApp.                     |
|                                |
|  SENÃO:                        |
|  [PenTool] Assinatura de       |
|  retirada                      |
|  (assinatura / nenhuma)        |
+--------------------------------+
```