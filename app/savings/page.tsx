import type { Metadata } from "next";
import SavingsCalculator from "@/components/SavingsCalculator";
import Pager from "@/components/Pager";

export const metadata: Metadata = { title: "Cost & Time Savings · Lakebase for Manufacturing" };

const qualitative = [
  ["Getting lakehouse data into the app", "Synced tables from Unity Catalog — point and click, continuous or triggered", "Build and run a reverse-ETL job per feed (Glue, Airflow, DMS or custom)", "Same as RDS, plus you host the scheduler"],
  ["Governance & access", "Unity Catalog grants, lineage and audit cover the DB and the lakehouse", "Separate IAM / DB roles; lineage stops at the export", "Separate roles; you build audit yourself"],
  ["Dev / test environments", "Copy-on-write branches of prod in seconds; scale to zero when idle", "Snapshot-restore full copies; billed 24×7 unless scheduled", "Full copies; manual provisioning"],
  ["Scaling", "Autoscaling between min/max CU; Always-On discount on the baseline", "Size for peak; resize with a maintenance window", "Size for peak; re-architect to scale"],
  ["Operations", "Fully managed: patching, backups, PITR, HA failover", "Managed engine, but you own networking, parameter groups, upgrades", "You own everything, including on-call"],
  ["Analytics on app data", "Lakehouse Sync streams changes back to Delta", "CDC pipeline (DMS / Debezium) to get data back", "CDC pipeline you build and run"],
  ["Hosting the app", "Databricks Apps with built-in SSO and service principals", "Separate hosting, SSO and secrets", "Separate hosting, SSO and secrets"],
];

export default function SavingsPage() {
  return (
    <article>
      <div className="eyebrow">Comparison</div>
      <h1>Cost & time: Lakebase vs AWS RDS vs standalone Postgres</h1>
      <p className="lede">
        For a manufacturer already on Databricks, the savings don't come from a cheaper hourly database — they come from the work that disappears:
        reverse-ETL pipelines, always-on dev copies, a second governance model and database operations.
      </p>

      <div className="callout" style={{ margin: "18px 0 28px" }}>
        <strong>Read this honestly:</strong> on a pure per-hour basis, a right-sized RDS instance can cost less than Lakebase compute for a steady production workload — the breakdown below shows that line on its own.
        Lakebase wins on total cost when you count elastic baselines, scale-to-zero branches, synced tables replacing custom pipelines, and engineering time. Adjust the assumptions to match this customer.
      </div>

      <SavingsCalculator />

      <h2>What changes day to day</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Lakebase</th>
              <th>AWS RDS for PostgreSQL</th>
              <th>Standalone Postgres</th>
            </tr>
          </thead>
          <tbody>
            {qualitative.map(([cap, lb, rds, self]) => (
              <tr key={cap}>
                <td><strong>{cap}</strong></td>
                <td className="small">{lb}</td>
                <td className="small">{rds}</td>
                <td className="small">{self}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How the model works</h2>
      <ul className="bullets small">
        <li><strong>Lakebase prod:</strong> baseline CU billed at the Always-On rate (25% below standard after 24h of continuous use), an HA secondary held at baseline, and bursts billed at the standard rate only for the hours they occur.</li>
        <li><strong>RDS / self-managed prod:</strong> provisioned for peak, 24×7, doubled for a Multi-AZ standby or replica.</li>
        <li><strong>Dev & test:</strong> Lakebase branches are half the prod size and billed only for active hours; RDS / EC2 copies are half-size and left running 24×7 (the common case). Lakebase branches store only changed data; others store a full copy each.</li>
        <li><strong>Data movement:</strong> synced-table compute per feed vs a custom reverse-ETL job per feed.</li>
        <li><strong>Labor:</strong> database operations plus per-feed pipeline maintenance, at your loaded engineer rate. Build hours cover platform setup, app hosting, feeds and environments.</li>
        <li>All rates are illustrative and editable. Confirm Lakebase pricing at databricks.com/product/pricing/lakebase and whether Lakebase usage draws down the customer's existing Databricks commit.</li>
      </ul>

      <Pager current="/savings" />
    </article>
  );
}
