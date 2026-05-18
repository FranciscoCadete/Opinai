# GitHub Actions — Secrets necessários

Configure em **Settings → Secrets and variables → Actions** do repositório.

| Secret | Obrigatório | Descrição |
|---|---|---|
| `VERCEL_TOKEN` | ✓ | Token da Vercel — [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ✓ | ID da organização Vercel — `vercel env pull` para obter |
| `VERCEL_PROJECT_ID` | ✓ | ID do projecto Vercel — `.vercel/project.json` após `vercel link` |
| `DATABASE_URL` | Produção | Pooler URL do Neon (apenas no environment `production`) |
| `JWT_SECRET` | Produção | String aleatória longa (≥ 32 chars) para assinar JWTs |

## Como obter VERCEL_ORG_ID e VERCEL_PROJECT_ID

```bash
pnpm exec vercel login
pnpm exec vercel link        # na pasta do projecto
cat .vercel/project.json     # contém orgId e projectId
```

## Ambientes do GitHub

O workflow `production.yml` usa o ambiente `production`.  
Criar em **Settings → Environments → New environment → production**  
e configurar as variáveis `DATABASE_URL` e `JWT_SECRET` aí.
