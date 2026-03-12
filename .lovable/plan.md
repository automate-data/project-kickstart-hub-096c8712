

## Sinalizar encomendas de moradores sem notificação

Quando uma encomenda pendente pertence a um morador com `whatsapp_enabled = false`, exibir um ícone de "sem notificação" no card da encomenda, indicando visualmente que o morador não foi notificado automaticamente.

### O que será feito

**Editar `src/pages/Packages.tsx`**:
- Importar o ícone `BellOff` do lucide-react
- No `PackageCard`, quando `pkg.status === 'pending'` e `pkg.resident?.whatsapp_enabled === false`, exibir um ícone `BellOff` com tooltip ou badge discreto ao lado do nome do morador
- Usar cor de alerta (amarelo/laranja) para chamar atenção sem poluir o layout

### Detalhe visual

Ao lado do nome do morador, aparecerá um pequeno ícone `BellOff` em amarelo/laranja com um tooltip "Morador não notificado", indicando que a notificação automática está desligada.

### Arquivos
- **Editar**: `src/pages/Packages.tsx` — adicionar ícone `BellOff` condicional no card

