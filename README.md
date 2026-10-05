# Lakebase for Manufacturing

A 6-page Next.js app that makes the case for Databricks Lakebase to a manufacturer already on the Databricks platform.

| # | Page | Route |
|---|------|-------|
| 1 | Predictive Maintenance & Asset Health | `/use-cases/predictive-maintenance` |
| 2 | Quality, Genealogy & Traceability | `/use-cases/quality-traceability` |
| 3 | Supply Chain & Inventory Control Tower | `/use-cases/supply-chain-control-tower` |
| 4 | Plant-Floor AI Agents & Operator Copilot | `/use-cases/plant-floor-ai-agents` |
| 5 | Cost & Time Savings (interactive calculator) | `/savings` |
| 6 | Example App — built with AI dev tools | `/example-app` |

`/` redirects to page 1.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

Or push to GitHub and import the repo at vercel.com/new — no environment variables are needed.

## Customizing

- Use-case content: `lib/content.ts`
- Cost model and default rates: `lib/costModel.ts` (all rates are also editable in the UI)
- Example app steps: `app/example-app/page.tsx`

Default prices are illustrative. Before presenting, replace them with the customer's contracted Databricks rate
(see databricks.com/product/pricing/lakebase) and current AWS pricing.
