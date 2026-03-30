

## Plano: Corrigir normalização de telefone no envio de WhatsApp

### Problema
O Twilio retorna erro **21211** (número inválido) porque a normalização E.164 atual não remove todos os caracteres problemáticos. O número chega como algo tipo `11 98843-4320` ou `+55 11988434320` e, após a limpeza, ainda pode conter espaços ou ter formato incorreto (ex: faltando o 9° dígito).

Na imagem do Twilio, o "To" mostra `whatsapp: +55 11988434320` — um espaço residual entre `+55` e `11`.

### Causa raiz
1. O regex `[\s\-\(\)]` deveria remover espaços, mas pode haver caracteres Unicode de espaço (non-breaking space, etc.) que não são capturados por `\s`
2. Não há validação do comprimento final do número (celular BR = 13 dígitos: +55 + 2 DDD + 9 dígitos)

### Alterações

**1. `supabase/functions/send-whatsapp/index.ts`** — Melhorar normalização:
- Remover TODOS os caracteres não-numéricos (exceto `+` inicial) com regex mais agressivo
- Adicionar validação de comprimento (mínimo 12, máximo 15 dígitos)
- Log do número original e normalizado para debug

**2. `src/pages/Residents.tsx`** — Sanitizar telefone no cadastro:
- Ao salvar/atualizar morador, limpar o telefone removendo caracteres não-numéricos e normalizando para formato E.164 antes de gravar no banco

### Detalhes técnicos

```typescript
// Nova normalização no edge function
let cleanPhone = phone.replace(/[^\d]/g, ""); // remove TUDO que não é dígito
if (cleanPhone.startsWith("55") && cleanPhone.length >= 12) {
  cleanPhone = `+${cleanPhone}`;
} else if (cleanPhone.length === 11 || cleanPhone.length === 10) {
  cleanPhone = `+55${cleanPhone}`;
} else {
  // número já pode ter + na frente, re-tentar
  cleanPhone = phone.replace(/[^\d+]/g, "");
  if (!cleanPhone.startsWith("+")) cleanPhone = `+55${cleanPhone.replace(/[^\d]/g, "")}`;
}
```

