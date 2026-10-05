import type { Metadata } from "next";
import MaintenanceDemo from "@/components/MaintenanceDemo";
import Pager from "@/components/Pager";

export const metadata: Metadata = { title: "Example App · Lakebase for Manufacturing" };

const steps: { title: string; who: string; time: string; prompt?: string; code?: string; note: string }[] = [
  {
    title: "Give your coding agent Databricks skills",
    who: "Developer + AI agent",
    time: "10 min",
    code: `# Authenticate the Databricks CLI to the customer workspace
databricks auth login --host https://<workspace>.cloud.databricks.com

# Add Databricks agent skills (Lakebase, Apps, synced tables, bundles)
# to your AI coding tool — e.g. Claude Code, Cursor or Copilot
git clone https://github.com/databricks/databricks-agent-skills`,
    note: "The agent skills teach the coding assistant current Lakebase and Databricks Apps patterns — autoscaling projects, OAuth token refresh, synced tables and deploy flow — so it doesn't guess from stale docs.",
  },
  {
    title: "Describe the app in plain language",
    who: "Developer",
    time: "15 min",
    prompt: `Build a Databricks App called "shift-maintenance-copilot" backed by Lakebase.
- Create a Lakebase autoscaling project "mfg-ops" (min 2 CU, max 8 CU, scale-to-zero on dev branches).
- Create a synced table from main.reliability.asset_risk_scores and main.reliability.asset_master (continuous mode).
- Create native tables work_orders and wo_events with an audit trigger.
- UI: technician view listing high-risk assets without an open work order; create / start / close work orders.
- Use the app's service principal and OAuth token refresh for the Postgres connection.
- Package everything as a Databricks Asset Bundle with dev and prod targets.`,
    note: "One prompt carries the architecture decisions from the use-case pages. The agent plans the project, schema, bundle and app code.",
  },
  {
    title: "Agent provisions Lakebase and syncs lakehouse data",
    who: "AI agent (you approve)",
    time: "20 min",
    code: `# Commands the agent proposes (verify flags with: databricks postgres --help)
databricks postgres create-project mfg-ops ...
databricks postgres create-synced-table \\
  main.reliability.asset_risk_scores  --project mfg-ops --mode continuous
databricks postgres create-synced-table \\
  main.reliability.asset_master       --project mfg-ops --mode triggered`,
    note: "No reverse-ETL job, no VPC peering, no separate secrets store. Access is governed by the same Unity Catalog grants as the source tables.",
  },
  {
    title: "Agent scaffolds the app and schema",
    who: "AI agent",
    time: "30–60 min",
    code: `CREATE TABLE work_orders (
  wo_id        bigserial PRIMARY KEY,
  asset_id     text NOT NULL,
  status       text NOT NULL CHECK (status IN ('open','in_progress','closed')),
  assignee     text,
  root_cause   text,
  opened_at    timestamptz DEFAULT now(),
  closed_at    timestamptz
);
CREATE UNIQUE INDEX one_open_wo_per_asset
  ON work_orders (asset_id) WHERE status <> 'closed';`,
    note: "The partial unique index enforces one open work order per asset — a rule that needs a real transactional database, not a lakehouse table.",
  },
  {
    title: "Test on a branch of production data",
    who: "Developer",
    time: "15 min",
    code: `# Copy-on-write branch of prod: seconds to create, scales to zero when idle
databricks postgres create-branch mfg-ops dev-alex --parent production
databricks bundle deploy -t dev`,
    note: "Every developer — and every agent run — gets realistic data without a full copy or a 24×7 instance.",
  },
  {
    title: "Deploy and close the loop",
    who: "Developer",
    time: "15 min",
    code: `databricks bundle deploy -t prod
databricks apps start shift-maintenance-copilot
# Enable Lakehouse Sync so work_orders lands in Delta for MTTR analytics`,
    note: "SSO, the service principal and the Lakebase connection are wired by the platform. Work-order outcomes flow back to Delta for model retraining.",
  },
];

export default function ExampleAppPage() {
  return (
    <article>
      <div className="eyebrow">Example app · built with AI dev tools</div>
      <h1>Shift Maintenance Copilot</h1>
      <p className="lede">
        Use case 1, end to end: failure-risk scores from the lakehouse served through Lakebase to a technician app that writes work orders transactionally —
        built by a developer steering an AI coding agent equipped with Databricks agent skills, and deployed as a Databricks App.
      </p>

      <div className="grid g4" style={{ marginTop: 20 }}>
        <div className="card"><div className="stat-label">Hands-on build time</div><div className="stat-value">~1 day</div><p className="small">Illustrative, for a working v1</p></div>
        <div className="card"><div className="stat-label">Custom pipelines</div><div className="stat-value">0</div><p className="small">Synced tables do the data movement</p></div>
        <div className="card"><div className="stat-label">New credentials to manage</div><div className="stat-value">0</div><p className="small">App service principal + UC grants</p></div>
        <div className="card"><div className="stat-label">Infra outside Databricks</div><div className="stat-value">None</div><p className="small">DB, app, auth and lineage in one place</p></div>
      </div>

      <h2>Try it</h2>
      <p className="muted small" style={{ marginTop: -6 }}>
        Interactive mock with demo data. Create a work order on a high-risk asset, then start and close it — the panel shows the SQL the real app sends to Lakebase.
      </p>
      <MaintenanceDemo />

      <h2>Architecture</h2>
      <div className="flow">
        <div className="step"><h3>Delta (Unity Catalog)</h3><p>asset_risk_scores and asset_master written by MLflow model jobs</p></div>
        <div className="step"><h3>Synced tables</h3><p>Continuous sync into Lakebase — read-only, sub-10ms lookups</p></div>
        <div className="step"><h3>Lakebase project</h3><p>Native work_orders and wo_events tables; autoscaling prod, branches for dev</p></div>
        <div className="step"><h3>Databricks App</h3><p>Technician UI with SSO; connects as the app's service principal</p></div>
        <div className="step"><h3>Lakehouse Sync</h3><p>Work-order changes stream back to Delta for MTTR dashboards and retraining</p></div>
      </div>

      <h2>The AI app-dev route, step by step</h2>
      <div className="grid" style={{ gap: 14 }}>
        {steps.map((s, i) => (
          <div className="card" key={s.title}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{i + 1}. {s.title}</h3>
              <span className="small muted">{s.who} · {s.time}</span>
            </div>
            <p style={{ marginBottom: 12 }}>{s.note}</p>
            {s.prompt && (
              <>
                <p className="code-label">Prompt to the coding agent</p>
                <pre className="code" style={{ whiteSpace: "pre-wrap" }}>{s.prompt}</pre>
              </>
            )}
            {s.code && <pre className="code">{s.code}</pre>}
          </div>
        ))}
      </div>

      <h2>Same app, three routes</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Step</th>
              <th>Lakebase + Databricks Apps + AI agent</th>
              <th>RDS + separate hosting + AI agent</th>
              <th>Self-managed Postgres + AI agent</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Database ready</td><td>Minutes</td><td>1–3 days (VPC, subnets, parameter groups, Multi-AZ)</td><td>1–2 weeks (EC2, replication, backups)</td></tr>
            <tr><td>Lakehouse data in the DB</td><td>Synced table per feed</td><td>Reverse-ETL job per feed + scheduler</td><td>Reverse-ETL job per feed + scheduler</td></tr>
            <tr><td>Auth & secrets</td><td>Platform-provided</td><td>SSO integration + secrets manager</td><td>SSO integration + secrets manager</td></tr>
            <tr><td>Dev environment with real data</td><td>Branch in seconds</td><td>Snapshot restore (hours), full copy</td><td>Dump / restore (hours), full copy</td></tr>
            <tr><td>Governance & lineage</td><td>Unity Catalog end to end</td><td>Stops at the export</td><td>Stops at the export</td></tr>
            <tr className="hl"><td>Typical time to a governed v1</td><td>Days</td><td>Weeks</td><td>Weeks to months</td></tr>
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        AI coding agents speed up the application code on every route. What they can't remove is the platform work around a standalone database — and that is exactly the work Lakebase takes off the table.
      </p>

      <Pager current="/example-app" />
    </article>
  );
}
