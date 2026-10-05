import type { Metadata } from "next";
import PricingExplorer from "@/components/PricingExplorer";
import Pager from "@/components/Pager";

export const metadata: Metadata = { title: "Pricing Model · Lakebase for Manufacturing" };

const meters = [
  {
    name: "Compute",
    unit: "CU-hour, metered per second",
    price: "$0.092 / CU-hour autoscaling · $0.069 Always-On baseline (AWS list)",
    points: [
      "1 CU ≈ 2 GB RAM plus matching CPU and local SSD.",
      "Autoscaling range from 0.5 to 32 CU (max − min ≤ 16); fixed sizes up to 112 CU.",
      "You pay for the CU actually running each second — not for a provisioned peak.",
      "Primary, HA secondaries, read replicas and every active branch each meter compute separately.",
    ],
  },
  {
    name: "Storage",
    unit: "GB-month, by storage type",
    price: "$0.345 database · $0.20 PITR history · $0.09 snapshots (AWS list)",
    points: [
      "Database storage is billed once per project — HA secondaries and read replicas share it.",
      "Branches are copy-on-write: you pay only for data a branch changes.",
      "PITR history (2–30 day window) and snapshots are separate, cheaper meters; snapshots are incremental.",
      "Only active data counts toward the 16 TB per-project quota.",
    ],
  },
  {
    name: "Data movement",
    unit: "Serverless pipeline DBUs",
    price: "Varies by sync mode and volume — read from system.billing.usage",
    points: [
      "Synced tables (Delta → Lakebase) run on serverless pipelines billed apart from database compute.",
      "Snapshot mode is the most efficient for large refreshes; Triggered balances cost and freshness; Continuous runs all the time and costs the most.",
      "Lakehouse Sync (Postgres → Delta) streams changes back for analytics.",
      "On RDS, the equivalent is a reverse-ETL / CDC job you build, host and pay for separately.",
    ],
  },
];

const levers = [
  ["Min CU (baseline)", "The capacity always available and its floor price", "Highest impact on steady workloads. With scale-to-zero off, baseline is billed 25% cheaper after 24h of continuous use", "Set to the overnight / quietest-hour working set"],
  ["Max CU (ceiling)", "How far a spike can scale", "Only billed when used — a high ceiling costs nothing at idle", "Set to observed peak plus headroom; watch for CPU saturation"],
  ["Scale-to-zero + timeout", "Whether compute stops when idle (min 60s timeout)", "Takes idle hours to $0. A dev branch used 8h × 5 days drops ~75% of compute hours", "On for dev/test branches; off (Always-On) for 24×7 prod"],
  ["High availability", "1–3 secondaries with automatic failover", "Adds compute per secondary; no extra storage; disables scale-to-zero", "Prod only; one secondary is usually enough"],
  ["Read replicas", "Extra read endpoints", "Adds compute per replica; shared storage (no copy)", "Use for read-heavy dashboards instead of upsizing the primary"],
  ["Branches + TTL", "Dev, test, CI and per-agent copies of prod", "Compute only when active; storage only for changed data", "Give every branch a TTL so stale branches expire"],
  ["Restore window (PITR)", "How far back you can restore", "History storage grows with window × change rate", "Keep 7 days for incidents; use snapshots for long retention"],
  ["Snapshot schedule", "Long-term recovery points", "Cheapest storage tier; incremental", "Prefer over a long PITR window"],
  ["Synced-table mode & scope", "Freshness of lakehouse data in Postgres", "Continuous is priciest; syncing full history inflates storage and pipeline cost", "Sync only the working subset (e.g. a 60-day view); group tables into one pipeline"],
  ["Connection pooling", "How many clients one compute can serve", "Lets you avoid buying CU just for connections", "Use the built-in pooler (up to 10,000 client connections)"],
  ["Commitment", "Databricks committed-use contract", "Lakebase draws on the same commit as other Databricks usage", "Confirm with the account team how Lakebase draws down the commit"],
];

const compare = [
  ["Unit of compute", "CU (≈2 GB RAM), fractional from 0.5", "DB instance class (e.g. db.r7g.large = 2 vCPU, 16 GiB)"],
  ["What you pay for", "Capacity running each second", "Instance size × every hour it exists"],
  ["Billing granularity", "Per second", "Per second, 10-minute minimum"],
  ["Scaling", "Automatic between min and max CU, no downtime", "Manual resize to a new instance class; brief outage or failover"],
  ["Idle cost", "$0 with scale-to-zero (not available with HA)", "Full instance price; can stop for up to 7 days, then it auto-starts"],
  ["Discount model", "Always-On: 25% off baseline, no commitment; plus Databricks commit discounts", "Reserved Instances: ~29–34% (1 yr) or ~52–72% (3 yr), locked to an instance family"],
  ["High availability", "Secondary compute; storage shared", "Multi-AZ: ~2× compute and 2× storage (cluster option ~3×)"],
  ["Read replicas", "Compute only; shared storage", "Full instance + full storage copy each"],
  ["Storage", "$0.345 / GB-mo, durability and IOPS included", "gp3 $0.115 / GB-mo + IOPS above 3,000 and throughput above 125 MB/s, × every copy"],
  ["Backups / PITR", "PITR $0.20 / GB-mo, snapshots $0.09 / GB-mo", "Free up to 100% of provisioned storage, then $0.095 / GB-mo"],
  ["Dev / test copies", "Copy-on-write branches in seconds", "Snapshot restore to a new full instance + full storage"],
  ["Getting lakehouse data in", "Synced tables (serverless pipeline)", "Build and run your own reverse-ETL / CDC"],
  ["Version lifecycle", "Managed upgrades", "Extended Support fees ($0.10–$0.20 / vCPU-hr) once a major version reaches end of standard support"],
  ["Invoices", "One Databricks bill, visible in system tables", "AWS bill across RDS, storage, backups, transfer, plus pipeline tooling"],
];

export default function PricingPage() {
  return (
    <article>
      <div className="eyebrow">Pricing model</div>
      <h1>How Lakebase pricing works, and how it compares to AWS RDS</h1>
      <p className="lede">
        Lakebase is a serverless database: you pay for the capacity actually running and the data you actually store. RDS is a provisioned database: you pay
        for an instance sized for peak, every hour it exists, and for a full storage copy behind every standby, replica and test environment.
      </p>

      <div className="callout" style={{ margin: "18px 0 8px" }}>
        <strong>The one-line rule:</strong> per GB of RAM per hour, Lakebase compute lists at a higher rate than an RDS instance. Lakebase comes out cheaper when your
        average load is well below peak, when you run several dev/test environments, or when you need HA and replicas. That's because RDS charges full price
        for idle capacity and duplicated storage. For a flat, 24×7 workload on a 3-year reserved instance, RDS can cost less on raw database spend.
      </div>

      <h2>1. The three meters on a Lakebase bill</h2>
      <div className="grid g3">
        {meters.map((m) => (
          <div className="card" key={m.name}>
            <div className="stat-label">{m.unit}</div>
            <h3 style={{ fontSize: 20, margin: "4px 0 6px" }}>{m.name}</h3>
            <p className="small" style={{ marginBottom: 10 }}><strong>{m.price}</strong></p>
            <ul className="bullets small">
              {m.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <h2>2. The formula</h2>
      <pre className="code" style={{ whiteSpace: "pre-wrap" }}>{`Monthly Lakebase cost =
    Σ baseline CU-hours  × Always-On rate      (min CU, scale-to-zero off, after 24h continuous)
  + Σ CU-hours above min × autoscaling rate    (spikes, per second)
  + Σ secondary / replica / branch CU-hours × autoscaling rate
  + database GB × $/GB-mo  +  PITR history GB × $/GB-mo  +  snapshot GB × $/GB-mo
  + synced-table pipeline DBUs

Monthly RDS cost =
    instance $/hr × 730 × (2 if Multi-AZ)  × (1 − RI discount)
  + replica and dev instances × their hours
  + gp3 GB × $/GB-mo × (number of copies)  + extra IOPS / throughput
  + backup GB beyond free allowance  + data transfer  + Extended Support (if applicable)
  + the reverse-ETL pipeline you run yourself`}</pre>

      <h2>3. Explore the levers on your workload</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        Pick a load shape and move the levers. The chart shows what each model bills for hour by hour, and the breakdowns rank which line items drive each bill.
      </p>
      <PricingExplorer />

      <h2>4. Every lever that moves the price</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Lever</th><th>What it controls</th><th>Price effect</th><th>Recommended setting</th></tr>
          </thead>
          <tbody>
            {levers.map(([l, what, eff, rec]) => (
              <tr key={l}><td><strong>{l}</strong></td><td className="small">{what}</td><td className="small">{eff}</td><td className="small">{rec}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>5. Lakebase vs AWS RDS for PostgreSQL, line by line</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Dimension</th><th>Databricks Lakebase</th><th>AWS RDS for PostgreSQL</th></tr>
          </thead>
          <tbody>
            {compare.map(([d, lb, rds]) => (
              <tr key={d}><td><strong>{d}</strong></td><td className="small">{lb}</td><td className="small">{rds}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>6. How a customer should estimate their own bill</h2>
      <div className="grid g2">
        <div className="card">
          <h3>Size it from metrics, not data volume</h3>
          <ul className="bullets small">
            <li><strong>Working set, not database size.</strong> A 2.5 TB database with a 20 GB hot working set doesn't need 2.5 TB of RAM. Up to ~75% of a compute's RAM serves as cache, so size the CU range so the 1-hour working set fits.</li>
            <li><strong>Baseline = quietest hour.</strong> Use the overnight working set for min CU. On an existing Postgres, take it from pg_stat and buffer cache metrics. On Lakebase, use the Metrics tab.</li>
            <li><strong>Ceiling = busiest shift change.</strong> Set max CU from peak CPU and working set, then watch cache hit rate and p95 latency.</li>
            <li><strong>Count environments honestly.</strong> List every dev, test, staging, CI and per-developer copy, and how many hours a week each is actually used.</li>
            <li><strong>Pick sync mode per table.</strong> Use Continuous only where seconds matter; Triggered or Snapshot elsewhere.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Then measure actual spend in system tables</h3>
          <pre className="code" style={{ fontSize: 12 }}>{`SELECT u.usage_date,
       u.usage_metadata,
       u.product_features.lakebase.storage_type,
       SUM(u.usage_quantity * p.pricing.default) AS list_cost
FROM   system.billing.usage u
JOIN   system.billing.list_prices p
  ON   u.sku_name = p.sku_name
 AND   u.usage_end_time >= p.price_start_time
 AND  (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
WHERE  u.billing_origin_product = 'DATABASE'
  AND  u.usage_date >= current_date() - 30
GROUP  BY ALL
ORDER  BY u.usage_date;`}</pre>
          <p className="small muted" style={{ marginTop: 8 }}>
            Storage rows split into BRANCH_DATA_STORAGE, BRANCH_CHANGE_STORAGE and BRANCH_HISTORY_STORAGE. Synced-table pipelines appear under their pipeline ID.
            Tag projects by plant or use case, and set a budget alert. Check the column and product names against the system-table docs in your workspace.
          </p>
        </div>
      </div>

      <h2>Notes on these numbers</h2>
      <ul className="bullets small">
        <li>Lakebase rates are AWS list prices as published in 2026: $0.092 / CU-hour autoscaling, $0.069 Always-On baseline, $0.345 / GB-month storage, $0.20 PITR, $0.09 snapshots. Databricks is running a 50% promotional compute discount through January 31, 2027. Azure and GCP rates differ.</li>
        <li>RDS rates are us-east-1 on-demand: db.r7g.large at $0.239 / hr (prices scale linearly within the r7g family), gp3 at $0.115 / GB-month, backups at $0.095 / GB-month beyond the free allowance. Reserved discounts are approximate.</li>
        <li>The explorer conservatively bills Lakebase HA secondaries and read replicas at the same size as the primary. It assumes each dev branch changes about five days' worth of data, and RDS dev environments are full copies sized to the dev branch.</li>
        <li>This page covers database spend only. Engineering, pipeline and operations time is on the Cost &amp; Time Savings page. Confirm all rates at databricks.com/product/pricing/lakebase and aws.amazon.com/rds/postgresql/pricing before quoting them.</li>
      </ul>

      <Pager current="/pricing" />
    </article>
  );
}
