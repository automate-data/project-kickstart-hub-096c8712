## Limpeza de condomínios de teste em produção

Aplicar a migration `supabase/migrations/20260429230500_cleanup_test_condominiums.sql` que apaga, em uma única transação:

### Condomínios removidos (3)
- Cond Adriana Margarida Prestes Maia Fernandes (`d70a0c27...`)
- Condomínio Guimarães Rosa (`5aa9389b...`)
- Residencial Vila Silvia (`b5c69a3a...`)

### Dados vinculados removidos
- 26 `packages` + 2 `package_events`
- 8 `residents`
- 9 `user_roles` (vínculos perdidos; contas auth permanecem)
- 2 `locations`
- 39 `system_logs`
- `user_sessions` órfãs desses condomínios

### Preservado
- **Solar dos Pinheiros - Bloco A** (`91b0ba23-a8b3-4481-98a0-0a3a74f00602`) e todos os seus dados
- Contas em `auth.users` (apenas perdem os papéis vinculados aos condomínios apagados)

### Garantias técnicas
- Transação única (BEGIN/COMMIT) — falha em qualquer DELETE = rollback total
- Trava inicial: aborta com exception se o ID de produção não estiver presente
- Ordem respeita dependências: events → packages → residents → logs → sessions → roles → locations → condominiums

Após aprovação, executo a migration e confirmo as contagens finais via `read_query`.