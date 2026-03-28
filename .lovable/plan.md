
## Plano: Custos Fixos por Mensagem no Painel Super Admin

### Contexto
Os custos de WhatsApp no `/superadmin` são calculados com custo fixo por mensagem, separados por condomínio via `system_logs`.

### Composição do Custo WhatsApp
```text
Twilio (Taxa de saída):       US$ 0,0050
Meta (WhatsApp Utility - BR): US$ 0,0068
TOTAL POR MENSAGEM:           US$ 0,0118
```

### Custos Fixos
- WhatsApp: $0.0118/msg (Twilio + Meta)
- IA (OCR label): $0.0035/chamada
- Cloud/Infra: $25.00/mês (rateado entre condomínios ativos)

### Arquitetura
- Custos calculados no frontend a partir de `system_logs` (event_type + condominium_id)
- Separação por condomínio automática via `condominium_id` nos logs
- Sem dependência de APIs externas para cálculo de custos
