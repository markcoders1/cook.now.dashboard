# cook.now AI cost dashboard

Internal React dashboard for estimated OpenAI cost from Realtime and vision
calls. Usage is grouped by anonymous app installation (device), not user
accounts or cooking sessions.

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Run the cook.now API on port 4000 with `ADMIN_API_KEY`,
optional `OPENAI_ADMIN_KEY`, `DASHBOARD_ORIGIN=http://localhost:5173`, and a
current `AI_RATE_CARD_JSON`.
Enter the same admin key in the dashboard gate. The key is held only in browser
session storage.

## Checks

```bash
pnpm lint
pnpm test
pnpm build
```

Costs for the app ledger are estimates from captured provider token usage.
When configured, the OpenAI organization section shows actual invoice spend
and completions usage from the OpenAI admin API. App-tracked records still
reset when the API process restarts.
