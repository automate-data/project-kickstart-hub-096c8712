## Objetivo

Apagar **completamente** o `Condomínio Solar dos Pinheiros` (id `df888202-1a6f-4121-956a-1270f04065e2`) e todos os dados/usuários vinculados **exclusivamente** a ele. O **Bloco A** (id `91b0ba23…`) e demais condomínios permanecem intactos.

## O que será apagado (resumo dos dados encontrados)

| Tabela | Registros |
|---|---|
| `packages` | 32 |
| `residents` | 7 |
| `user_roles` | 11 |
| `locations` | 6 |
| `system_logs` | 96 |
| `package_events` | (todos os ligados aos 32 pacotes) |
| `user_sessions` | 0 |
| `condominiums` | 1 |
| Fotos no bucket `package-photos` | 32 arquivos |

## Usuários (auth.users)

Usuários vinculados ao condomínio-alvo:

| Usuário | Outras vinculações? | Ação |
|---|---|---|
| `helena@cond.internal` (porteira) | nenhuma | **apagar de auth.users** |
| `tereza@cond.internal` (tower_admin) | nenhuma | **apagar de auth.users** |
| `maria@cond.internal` (porteira) | nenhuma | **apagar de auth.users** |
| `julia@cond.internal` (admin) | nenhuma | **apagar de auth.users** |
| `contato@automatedata.com.br` (admin) | sim — 4 outros condomínios (incl. Bloco A) | **manter conta**, remover apenas a role deste condomínio |

## Ordem de execução (uma migration única, transacional)

```text
1. Coletar IDs em CTEs (packages, residents, locations do condomínio-alvo)
2. DELETE FROM package_events WHERE package_id IN (...)
3. DELETE FROM system_logs    WHERE condominium_id = '<id>'
4. DELETE FROM user_sessions  WHERE condominium_id = '<id>' (já 0)
5. DELETE FROM packages       WHERE condominium_id = '<id>'
6. DELETE FROM residents      WHERE condominium_id = '<id>'
7. DELETE FROM user_roles     WHERE condominium_id = '<id>'
8. DELETE FROM locations      WHERE condominium_id = '<id>'
9. DELETE FROM condominiums   WHERE id = '<id>'
10. DELETE FROM auth.users    WHERE id IN (helena, tereza, maria, julia)
    (NÃO apagar contato@automatedata.com.br — tem outros vínculos)
```

A migration usa um único bloco `DO $$ … $$` para rodar tudo dentro de uma transação. Se algum passo falhar, nada é apagado.

## Limpeza das fotos no Storage

Após a migration, rodar um script que:
1. Lê os 32 `photo_url` capturados antes da exclusão (vou capturá-los em uma view temporária ou listar via consulta antes de rodar a migration).
2. Chama `supabase.storage.from('package-photos').remove([...])` com a lista.

Como a migration apaga os pacotes e perdemos os `photo_url`, vou:
- **Antes** da migration: rodar uma query para extrair a lista dos 32 `photo_url` e salvá-la inline na própria migration como um array, OU
- Criar um pequeno script Node/Deno que: (a) lista os `photo_url`, (b) executa a migration, (c) apaga os arquivos do bucket.

Abordagem escolhida: **uma edge function descartável** `delete-condominium-data` que faz tudo em sequência usando `SERVICE_ROLE_KEY` (lê fotos → apaga fotos do bucket → roda os DELETEs em ordem → apaga auth.users via Admin API). Mais seguro que tentar coordenar storage + SQL manualmente. A função é apagada logo depois.

## Verificações pós-execução

Após a exclusão, rodo as mesmas contagens (`packages`, `residents`, `user_roles`, `locations`, `system_logs`, `condominiums`, `auth.users` dos 4 e-mails) para confirmar **zero** registros remanescentes do condomínio-alvo, e confirmo que o Bloco A continua com os mesmos números (24 recebidas hoje, 95 moradores, etc.).

## Pontos importantes

- **Irreversível**. Não há soft-delete aqui — é DELETE físico, conforme solicitado ("excluir todos os dados").
- O Bloco A e a conta `contato@automatedata.com.br` **não são tocados**.
- A memória `mem://preferences/demo` referencia "Solar dos Pinheiros" como ambiente demo — vou atualizá-la depois para apontar explicitamente ao **Bloco A** (id `91b0ba23…`), evitando confusão futura.

## Detalhes técnicos

- A edge function usará `@supabase/supabase-js` com `SERVICE_ROLE_KEY` para bypass de RLS (necessário para `auth.admin.deleteUser` e DELETEs em `system_logs`/`user_sessions` que hoje não têm policies de DELETE).
- Validação dupla no início: confirma que o `id` recebido **não é** `91b0ba23-a8b3-4481-98a0-0a3a74f00602` (Bloco A) — guarda extra contra acidente.
- Resposta da função retorna o relatório de quantos registros foram apagados em cada tabela, para mostrar a você no chat.
