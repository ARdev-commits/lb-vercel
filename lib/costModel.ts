export type Inputs = {
  prodPeakGb: number;        // RAM needed at peak for production
  baselinePct: number;       // baseline load as % of peak
  burstHoursPct: number;     // % of hours running above baseline
  ha: boolean;               // high availability for prod
  nonProdEnvs: number;       // dev / test / staging / per-dev environments
  nonProdHrsWeek: number;    // hours per week non-prod is actually used
  dataGb: number;            // operational data size
  pipelines: number;         // lakehouse -> app data feeds
  engRate: number;           // fully loaded $/hr for an engineer
  teamSize: number;          // engineers on the build
  years: number;             // TCO horizon
};

export type Rates = {
  lbCuHr: number;            // Lakebase $/CU-hr (standard autoscaling)
  lbGbPerCu: number;         // RAM per CU
  lbAlwaysOnDisc: number;    // Always-On baseline discount
  lbStorageGbMo: number;
  lbSyncMo: number;          // synced table compute per feed / month
  lbBranchChangePct: number; // copy-on-write: share of data a branch changes
  rdsGbHr: number;           // RDS Postgres $/GB-RAM-hr (single-AZ, memory optimized)
  rdsStorageGbMo: number;
  ec2GbHr: number;           // self-managed EC2 $/GB-RAM-hr
  ebsGbMo: number;
  etlMo: number;             // custom reverse-ETL compute per feed / month
};

export type Effort = {
  opsHrsMo: number;          // patching, upgrades, backups, tuning, on-call
  pipeMaintHrsMo: number;    // per feed
  pipeBuildHrs: number;      // per feed
  envSetupHrs: number;       // per non-prod env
  platformHrs: number;       // network, IAM, secrets, backup, monitoring, governance
  appPlatformHrs: number;    // hosting, SSO, CI/CD, secrets for the app itself
};

export type OptionKey = "lakebase" | "rds" | "self";

export const OPTIONS: { key: OptionKey; label: string; color: string }[] = [
  { key: "lakebase", label: "Databricks Lakebase", color: "var(--series-1)" },
  { key: "rds", label: "AWS RDS for PostgreSQL", color: "var(--series-2)" },
  { key: "self", label: "Standalone Postgres (self-managed)", color: "var(--series-3)" },
];

export const DEFAULT_INPUTS: Inputs = {
  prodPeakGb: 64,
  baselinePct: 35,
  burstHoursPct: 20,
  ha: true,
  nonProdEnvs: 4,
  nonProdHrsWeek: 45,
  dataGb: 500,
  pipelines: 6,
  engRate: 110,
  teamSize: 2,
  years: 3,
};

// Illustrative list-price style assumptions. Every value is editable in the UI.
export const DEFAULT_RATES: Rates = {
  lbCuHr: 0.13,
  lbGbPerCu: 2,
  lbAlwaysOnDisc: 0.25,
  lbStorageGbMo: 0.35,
  lbSyncMo: 90,
  lbBranchChangePct: 10,
  rdsGbHr: 0.0141,   // ~ db.r6g.large $0.225/hr ÷ 16 GB
  rdsStorageGbMo: 0.115,
  ec2GbHr: 0.0063,   // ~ r6g.large $0.1008/hr ÷ 16 GB
  ebsGbMo: 0.08,
  etlMo: 250,
};

export const DEFAULT_EFFORT: Record<OptionKey, Effort> = {
  lakebase: { opsHrsMo: 4, pipeMaintHrsMo: 0.5, pipeBuildHrs: 4, envSetupHrs: 0.5, platformHrs: 16, appPlatformHrs: 16 },
  rds: { opsHrsMo: 16, pipeMaintHrsMo: 6, pipeBuildHrs: 60, envSetupHrs: 16, platformHrs: 120, appPlatformHrs: 80 },
  self: { opsHrsMo: 50, pipeMaintHrsMo: 6, pipeBuildHrs: 60, envSetupHrs: 32, platformHrs: 240, appPlatformHrs: 80 },
};

const HRS_MO = 730;

export type Result = {
  key: OptionKey;
  prodCompute: number;
  nonProdCompute: number;
  storage: number;
  dataMovement: number;
  infraMo: number;
  laborMo: number;
  runMo: number;
  buildHrs: number;
  buildCost: number;
  buildWeeks: number;
  tco: number;
};

export function compute(i: Inputs, r: Rates, e: Record<OptionKey, Effort>): Result[] {
  const haMult = i.ha ? 2 : 1;
  const nonProdHrsMo = (i.nonProdHrsWeek * 52) / 12;
  const nonProdGb = i.prodPeakGb / 2;

  const out: Result[] = [];
  for (const o of OPTIONS) {
    const ef = e[o.key];
    let prodCompute = 0, nonProdCompute = 0, storage = 0, dataMovement = 0;

    if (o.key === "lakebase") {
      const peakCu = i.prodPeakGb / r.lbGbPerCu;
      const baseCu = peakCu * (i.baselinePct / 100);
      const burstCu = peakCu - baseCu;
      const baseRate = r.lbCuHr * (1 - r.lbAlwaysOnDisc);
      // Baseline billed at Always-On rate; HA secondary held at baseline; bursts at standard rate
      prodCompute = baseCu * HRS_MO * baseRate * haMult + burstCu * HRS_MO * (i.burstHoursPct / 100) * r.lbCuHr;
      // Branches scale to zero when idle
      nonProdCompute = i.nonProdEnvs * (nonProdGb / r.lbGbPerCu) * nonProdHrsMo * r.lbCuHr;
      // Copy-on-write: branches only store what they change
      storage = i.dataGb * r.lbStorageGbMo * (1 + i.nonProdEnvs * (r.lbBranchChangePct / 100));
      dataMovement = i.pipelines * r.lbSyncMo;
    } else {
      const gbHr = o.key === "rds" ? r.rdsGbHr : r.ec2GbHr;
      const stor = o.key === "rds" ? r.rdsStorageGbMo : r.ebsGbMo;
      // Provisioned for peak, 24x7
      prodCompute = i.prodPeakGb * gbHr * HRS_MO * haMult;
      // Non-prod copies typically left running 24x7
      nonProdCompute = i.nonProdEnvs * nonProdGb * gbHr * HRS_MO;
      // Full data copy per environment (+ standby copy for HA)
      storage = i.dataGb * stor * (haMult + i.nonProdEnvs);
      dataMovement = i.pipelines * r.etlMo;
    }

    const infraMo = prodCompute + nonProdCompute + storage + dataMovement;
    const laborMo = (ef.opsHrsMo + ef.pipeMaintHrsMo * i.pipelines) * i.engRate;
    const runMo = infraMo + laborMo;
    const buildHrs = ef.platformHrs + ef.appPlatformHrs + ef.pipeBuildHrs * i.pipelines + ef.envSetupHrs * i.nonProdEnvs;
    const buildCost = buildHrs * i.engRate;
    const buildWeeks = buildHrs / (40 * Math.max(1, i.teamSize));
    const tco = buildCost + runMo * 12 * i.years;

    out.push({ key: o.key, prodCompute, nonProdCompute, storage, dataMovement, infraMo, laborMo, runMo, buildHrs, buildCost, buildWeeks, tco });
  }
  return out;
}

export const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 10_000
    ? `$${Math.round(n / 1000).toLocaleString()}K`
    : `$${Math.round(n).toLocaleString()}`;
