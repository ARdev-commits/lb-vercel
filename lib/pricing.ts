// Lakebase vs AWS RDS for PostgreSQL — pricing model used by the /pricing page.
// Rates are list-price figures as published in 2026 (AWS, us-east-1). Every rate is editable in the UI.

export type PricingRates = {
  lbCuHr: number;          // Lakebase autoscaling compute, $/CU-hour
  lbAlwaysOnDisc: number;  // discount on baseline (min CU) when scale-to-zero is off
  lbPromoDisc: number;     // promotional compute discount (Databricks: 50% through Jan 31, 2027)
  lbGbPerCu: number;       // ~2 GB RAM per CU
  lbStorageGbMo: number;   // database (branch) storage
  lbPitrGbMo: number;      // PITR / history storage
  lbSnapshotGbMo: number;  // snapshot storage
  rdsR7gLargeHr: number;   // db.r7g.large (2 vCPU, 16 GiB) Single-AZ on-demand
  rdsGp3GbMo: number;
  rdsBackupGbMo: number;   // backup storage beyond the free allowance
  rdsRi1yrDisc: number;
  rdsRi3yrDisc: number;
};

export const PRICING_RATES: PricingRates = {
  lbCuHr: 0.092,
  lbAlwaysOnDisc: 0.25,
  lbPromoDisc: 0.5,
  lbGbPerCu: 2,
  lbStorageGbMo: 0.345,
  lbPitrGbMo: 0.2,
  lbSnapshotGbMo: 0.09,
  rdsR7gLargeHr: 0.239,
  rdsGp3GbMo: 0.115,
  rdsBackupGbMo: 0.095,
  rdsRi1yrDisc: 0.3,
  rdsRi3yrDisc: 0.55,
};

// Valid Lakebase autoscaling sizes
export const CU_SIZES = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 24, 28, 32];
export const roundUpCu = (cu: number) => (cu <= 0 ? 0 : CU_SIZES.find((s) => s >= cu - 1e-9) ?? 32);

// RDS memory-optimized Graviton family (r7g): price scales linearly with size
export const RDS_SIZES = [
  { name: "db.r7g.large", gb: 16, mult: 1 },
  { name: "db.r7g.xlarge", gb: 32, mult: 2 },
  { name: "db.r7g.2xlarge", gb: 64, mult: 4 },
  { name: "db.r7g.4xlarge", gb: 128, mult: 8 },
  { name: "db.r7g.8xlarge", gb: 256, mult: 16 },
  { name: "db.r7g.12xlarge", gb: 384, mult: 24 },
];

export type Profile = { key: string; label: string; desc: string; shape: number[] };

// Share of peak demand for each hour of the day (0–23)
export const PROFILES: Profile[] = [
  {
    key: "two-shift",
    label: "Two-shift plant app",
    desc: "Busy 6am–10pm with shift-change spikes, quiet overnight",
    shape: [0.1, 0.1, 0.1, 0.1, 0.12, 0.3, 1, 0.75, 0.6, 0.55, 0.55, 0.5, 0.55, 0.6, 1, 0.75, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.15, 0.1],
  },
  {
    key: "three-shift",
    label: "24×7 three-shift MES-adjacent",
    desc: "Steady round-the-clock load with spikes at each shift change",
    shape: [0.55, 0.5, 0.5, 0.5, 0.55, 0.65, 1, 0.7, 0.6, 0.6, 0.6, 0.6, 0.6, 0.65, 1, 0.7, 0.6, 0.6, 0.6, 0.6, 0.6, 0.65, 1, 0.7],
  },
  {
    key: "office",
    label: "Planner / office-hours app",
    desc: "Used 8am–6pm by planners and engineers, idle otherwise",
    shape: [0, 0, 0, 0, 0, 0, 0, 0.2, 0.7, 1, 0.9, 0.8, 0.6, 0.8, 0.9, 0.8, 0.6, 0.3, 0.05, 0, 0, 0, 0, 0],
  },
  {
    key: "batch",
    label: "Overnight batch + light day use",
    desc: "Heavy nightly sync/scoring window, light interactive use by day",
    shape: [1, 1, 0.95, 0.9, 0.4, 0.2, 0.2, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.2, 0.2, 0.2, 0.2, 0.2, 0.6, 0.9],
  },
];

export type PricingInputs = {
  profile: string;
  peakGb: number;           // working memory needed at peak
  minCu: number;            // Lakebase autoscaling minimum
  maxCu: number;            // Lakebase autoscaling maximum
  prodScaleToZero: boolean; // false = Always-On pricing on the baseline
  ha: boolean;              // Lakebase HA secondary / RDS Multi-AZ
  readReplicas: number;
  dataGb: number;
  dailyChangePct: number;   // % of data changed per day (drives PITR / backup storage)
  pitrDays: number;
  snapshotGb: number;       // long-term snapshot storage (incremental)
  devBranches: number;
  devCu: number;
  devHrsWeek: number;
  rdsHeadroomPct: number;   // headroom RDS is sized with above observed peak
  rdsPricing: "od" | "ri1" | "ri3";
  rdsDevStopped: boolean;   // RDS dev instances stopped outside working hours
  promo: boolean;
};

export const DEFAULT_PRICING_INPUTS: PricingInputs = {
  profile: "two-shift",
  peakGb: 32,
  minCu: 2,
  maxCu: 16,
  prodScaleToZero: false,
  ha: true,
  readReplicas: 0,
  dataGb: 500,
  dailyChangePct: 2,
  pitrDays: 7,
  snapshotGb: 100,
  devBranches: 4,
  devCu: 2,
  devHrsWeek: 45,
  rdsHeadroomPct: 25,
  rdsPricing: "od",
  rdsDevStopped: false,
  promo: false,
};

export type HourPoint = { hour: number; demandCu: number; lbCu: number; capped: boolean; rdsCu: number };

export type LineItem = { label: string; lever: string; amount: number };

export type PricingResult = {
  hours: HourPoint[];
  lb: { items: LineItem[]; total: number; avgCu: number; peakBilledCu: number; capped: boolean };
  rds: { items: LineItem[]; total: number; instance: string; instanceGb: number; devInstance: string };
  perGbHr: { lbStd: number; lbBase: number; rds: number };
  breakEvenUtil: number; // avg utilization (of provisioned capacity) below which Lakebase compute is cheaper
};

const DAYS_MO = 730 / 24;

export function computePricing(i: PricingInputs, r: PricingRates): PricingResult {
  const profile = PROFILES.find((p) => p.key === i.profile) ?? PROFILES[0];
  const promo = i.promo ? 1 - r.lbPromoDisc : 1;
  // HA computes must stay active, so scale-to-zero is unavailable when HA is on
  const s2z = i.prodScaleToZero && !i.ha;
  const stdRate = r.lbCuHr * promo;
  const baseRate = s2z ? stdRate : stdRate * (1 - r.lbAlwaysOnDisc);
  const peakCu = i.peakGb / r.lbGbPerCu;

  // RDS: smallest r7g size covering peak + headroom
  const needGb = i.peakGb * (1 + i.rdsHeadroomPct / 100);
  const inst = RDS_SIZES.find((s) => s.gb >= needGb) ?? RDS_SIZES[RDS_SIZES.length - 1];
  const rdsDisc = i.rdsPricing === "ri1" ? r.rdsRi1yrDisc : i.rdsPricing === "ri3" ? r.rdsRi3yrDisc : 0;
  const rdsInstHr = r.rdsR7gLargeHr * inst.mult * (1 - rdsDisc);
  const rdsCuEquiv = inst.gb / r.lbGbPerCu;

  // ---- Lakebase production compute, hour by hour
  let baseCuHrs = 0, burstCuHrs = 0, sumCu = 0, peakBilled = 0, anyCap = false;
  const hours: HourPoint[] = profile.shape.map((s, h) => {
    const demand = s * peakCu;
    let billed: number;
    if (demand <= 0 && s2z) billed = 0;
    else billed = Math.min(Math.max(roundUpCu(demand), i.minCu), i.maxCu);
    const capped = demand > i.maxCu + 1e-9;
    anyCap = anyCap || capped;
    const base = billed > 0 ? Math.min(billed, i.minCu) : 0;
    baseCuHrs += base;
    burstCuHrs += billed - base;
    sumCu += billed;
    peakBilled = Math.max(peakBilled, billed);
    return { hour: h, demandCu: demand, lbCu: billed, capped, rdsCu: rdsCuEquiv };
  });

  const lbBase = baseCuHrs * DAYS_MO * baseRate;
  const lbBurst = burstCuHrs * DAYS_MO * stdRate;
  // HA: secondary compute tracks the primary (modelled conservatively at the same billed size); HA cannot scale to zero
  const lbHa = i.ha ? lbBase + lbBurst : 0;
  // Read replicas: modelled at the same profile as the primary; shared storage
  const lbReplicas = i.readReplicas * (lbBase + lbBurst);
  const lbStorage = i.dataGb * r.lbStorageGbMo;
  const changedGbDay = i.dataGb * (i.dailyChangePct / 100);
  const lbPitr = changedGbDay * i.pitrDays * r.lbPitrGbMo;
  const lbSnap = i.snapshotGb * r.lbSnapshotGbMo;
  const devHrsMo = (i.devHrsWeek * 52) / 12;
  const lbDevCompute = i.devBranches * i.devCu * devHrsMo * stdRate;
  // Branches store only what they change (assume each diverges by its daily change × 5 working days)
  const lbDevStorage = i.devBranches * changedGbDay * 5 * r.lbStorageGbMo;

  const lbItems: LineItem[] = [
    { label: "Prod compute — baseline (min CU)", lever: s2z ? "Min CU · scale-to-zero on" : "Min CU · Always-On rate", amount: lbBase },
    { label: "Prod compute — autoscaled above baseline", lever: "Max CU · load shape", amount: lbBurst },
    { label: "HA secondary compute", lever: "HA on/off", amount: lbHa },
    { label: "Read replica compute", lever: "Replica count", amount: lbReplicas },
    { label: "Dev / test branch compute", lever: "Branch count · active hours", amount: lbDevCompute },
    { label: "Database storage (prod)", lever: "Data size", amount: lbStorage },
    { label: "Branch storage (changed data only)", lever: "Branch count · TTL", amount: lbDevStorage },
    { label: "PITR history storage", lever: "Restore window", amount: lbPitr },
    { label: "Snapshot storage", lever: "Snapshot schedule", amount: lbSnap },
  ];
  const lbTotal = lbItems.reduce((a, b) => a + b.amount, 0);

  // ---- RDS
  const rdsProd = rdsInstHr * 730 * (i.ha ? 2 : 1);
  const rdsReplicas = i.readReplicas * rdsInstHr * 730;
  const rdsStorage = i.dataGb * r.rdsGp3GbMo * (i.ha ? 2 : 1);
  const rdsReplicaStorage = i.readReplicas * i.dataGb * r.rdsGp3GbMo;
  // Backup storage: retained changes beyond the free allowance (100% of provisioned storage) + manual snapshots
  const backupGb = changedGbDay * i.pitrDays + i.snapshotGb;
  const rdsBackup = Math.max(0, backupGb - i.dataGb) * r.rdsBackupGbMo;
  const devInst = RDS_SIZES.find((s) => s.gb >= i.devCu * r.lbGbPerCu) ?? RDS_SIZES[0];
  const devInstHr = r.rdsR7gLargeHr * devInst.mult; // dev instances are rarely reserved
  const rdsDevHrs = i.rdsDevStopped ? devHrsMo : 730;
  const rdsDev = i.devBranches * devInstHr * rdsDevHrs;
  const rdsDevStorage = i.devBranches * i.dataGb * r.rdsGp3GbMo; // full copy per environment (storage bills even when stopped)

  const rdsItems: LineItem[] = [
    { label: `Prod instance (${inst.name}${i.ha ? ", Multi-AZ ×2" : ""})`, lever: "Instance size · Multi-AZ · RI term", amount: rdsProd },
    { label: "Read replica instances", lever: "Replica count", amount: rdsReplicas },
    { label: `Dev / test instances (${devInst.name})`, lever: i.rdsDevStopped ? "Stopped off-hours" : "Running 24×7", amount: rdsDev },
    { label: `gp3 storage (prod${i.ha ? " + standby" : ""})`, lever: "Allocated GB · Multi-AZ", amount: rdsStorage },
    { label: "Replica storage (full copies)", lever: "Replica count", amount: rdsReplicaStorage },
    { label: "Dev / test storage (full copies)", lever: "Env count", amount: rdsDevStorage },
    { label: "Backup storage beyond free tier", lever: "Retention · snapshots", amount: rdsBackup },
  ];
  const rdsTotal = rdsItems.reduce((a, b) => a + b.amount, 0);

  const perGbHr = { lbStd: stdRate / r.lbGbPerCu, lbBase: baseRate / r.lbGbPerCu, rds: rdsInstHr / inst.gb };

  return {
    hours,
    lb: { items: lbItems, total: lbTotal, avgCu: sumCu / 24, peakBilledCu: peakBilled, capped: anyCap },
    rds: { items: rdsItems, total: rdsTotal, instance: inst.name, instanceGb: inst.gb, devInstance: devInst.name },
    perGbHr,
    breakEvenUtil: perGbHr.rds / perGbHr.lbStd,
  };
}

export const money = (n: number) =>
  n >= 100_000 ? `$${Math.round(n / 1000).toLocaleString()}K` : `$${Math.round(n).toLocaleString()}`;
