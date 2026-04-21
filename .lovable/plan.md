

## Documentação de Infraestrutura e Privacidade — Chegueii

Vou gerar **um PDF executivo + técnico** com diagrama de arquitetura embutido, pronto pra entregar ao DPO/cliente.

### Conteúdo do documento

**Capa**
- Título, sistema (Chegueii — gestão de encomendas para condomínios), versão, data, escopo

**1. Sumário executivo** (2 páginas)
- O que é o sistema, quem usa (admin condomínio, porteiro central, porteiro de bloco, morador via WhatsApp)
- Visão geral da arquitetura em 1 parágrafo
- Resumo dos subprocessadores

**2. Arquitetura de infraestrutura**
- **Diagrama de fluxo de dados** (Mermaid renderizado como PNG e embutido):
  ```
  Porteiro (PWA) → Lovable CDN → Lovable Cloud (Supabase / AWS us-east-1)
                                  ├── Postgres (RLS, isolamento por condomínio)
                                  ├── Auth (JWT + bcrypt)
                                  ├── Storage (fotos anonimizadas)
                                  └── Edge Functions (Deno)
                                       ├──→ Google Gemini (OCR de etiqueta)
                                       └──→ Twilio (WhatsApp para morador)
  ```
- Hospedagem do frontend (Lovable + custom domain `cheguei.automatedata.com.br`)
- Backend (Lovable Cloud / Supabase, projeto `pkejkxjbvvcayobktucj`, AWS us-east-1)
- PWA e cache local (service worker)

**3. Componentes de backend**
- Tabela com cada componente Supabase em uso (Postgres, Auth, Storage, Edge Functions) e finalidade
- Lista das 8 edge functions e o que cada uma faz
- Buckets de storage (`package-photos`, `boletos`)

**4. Subprocessadores (foco LGPD)**
Tabela completa: serviço · finalidade · dados trafegados · localização · base legal sugerida
- Lovable / Supabase (AWS us-east-1, EUA) — hospedagem e dados
- Twilio — notificações WhatsApp (telefone E.164, nome, descrição da encomenda)
- Google Gemini 2.5 Flash via Lovable AI Gateway — OCR (imagem bruta da etiqueta antes da anonimização)
- AWS S3 via Supabase Storage — armazenamento de fotos já anonimizadas

**5. Dados pessoais tratados**
- Inventário por categoria de titular: morador, funcionário, administrador
- Para cada um: campos, finalidade, retenção atual, onde fica armazenado

**6. Segurança**
- RLS por `condominium_id` (isolamento multi-tenant)
- Roles em tabela separada (`user_roles`) — sem escalada via JWT
- Senhas com bcrypt, JWT auto-refresh
- Anonimização LGPD client-side (blur de CPF, endereço, telefone, QR codes antes do upload)
- Soft-delete (`deleted_at`) + observação sobre processo de hard-delete sob solicitação
- Edge functions com `verify_jwt` controlado por função

**7. Aviso de transferência internacional (LGPD)**
- Dados trafegam para EUA (AWS us-east-1, Twilio, Google Cloud)
- Cláusula sugerida pra política de privacidade
- Recomendação: incluir no contrato com o condomínio

**8. Pendências de adequação LGPD**
Checklist priorizado:
- [ ] DPA com Lovable, Twilio, Google
- [ ] Política de retenção das fotos (hoje sem TTL)
- [ ] Processo formal de exclusão definitiva (hoje só soft-delete)
- [ ] Página `/privacidade` e `/termos` no app
- [ ] Encarregado (DPO) definido em contrato
- [ ] Validação se região AWS atende requisitos do cliente

**9. Anexos técnicos**
- IDs e endpoints (projeto Supabase, URLs do app)
- Lista das tabelas principais com finalidade
- Lista de secrets configurados (sem valores)

### Como vou gerar

1. Criar o diagrama Mermaid → renderizar como PNG (via `mermaid-cli` ou serviço público) → embutir no PDF
2. Gerar PDF com **ReportLab** (Platypus para layout multi-página com tabelas, headings e imagem)
3. Paleta sóbria: navy `#1E2761` + cinza, sem cores berrantes (público jurídico/técnico)
4. Fonte Helvetica (built-in, sem risco de glyphs faltando)
5. **QA obrigatório**: converter cada página com `pdftoppm -r 150` e revisar visualmente — overlap, corte, contraste, diagrama legível

### Entregável

**Arquivo**: `/mnt/documents/Chegueii_Infraestrutura_e_Privacidade.pdf`

Após gerar, entrego via `<lov-artifact>` pra você baixar. Versionamento `_v2`, `_v3` se pedir ajustes.

### Fora de escopo (posso fazer numa próxima)

- Criar páginas `/privacidade` e `/termos` dentro do app
- Templates de DPA pra cada subprocessador
- Versão em inglês

