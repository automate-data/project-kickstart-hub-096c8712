

## Plano: Deletar encomendas de teste do Solar dos Pinheiros

### Contexto
Existem 12 encomendas no condomínio "Solar dos Pinheiros" (ID: `df888202-1a6f-4121-956a-1270f04065e2`) que precisam ser removidas antes da apresentação.

### Alteração

**1. Migration SQL para deletar os pacotes**
- Executar `DELETE FROM packages WHERE condominium_id = 'df888202-...'`
- Também limpar os `system_logs` relacionados a esses pacotes (event_type `package_received`, `package_picked_up`, `whatsapp_sent`) para o mesmo condomínio, mantendo o painel de custos limpo

### Sem alterações de código
Apenas limpeza de dados via migration.

