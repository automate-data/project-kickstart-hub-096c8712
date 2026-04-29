
## Mudança

Trocar a string `'Portaria'` por `'Bloco'` em dois pontos do front que disparam a notificação de alocação em armário:

- `src/pages/Dashboard.tsx` linha 136 → `tower_name: 'Bloco'`
- `src/pages/Packages.tsx` linha 427 → `tower_name: 'Bloco'`

Apenas isso. Não toca no template aprovado da Twilio (mesmo `ContentSid`), não muda fluxos de torre (`TowerDashboard`/`TowerCollect` continuam mandando o nome real da torre).

## Resultado

A mensagem fica:

> "Olá, NATALIA FERREIRA DE ALMEIDA! Sua encomenda chegou no **Bloco** e está guardada no armário Armário 05. Retire quando preferir."
