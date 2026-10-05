"use client";

import { useMemo, useState } from "react";
import {
  computePricing, CU_SIZES, DEFAULT_PRICING_INPUTS, money, PRICING_RATES, PROFILES,
  type PricingInputs, type PricingRates, type PricingResult,
} from "@/lib/pricing";

/* ---------------- small controls ---------------- */

function Range(p: { label: string; value: number; min: number; max: number; step?: number; fmt?: (n: number) => string; onChange: (n: number) => void; hint?: string }) {
  const fmt = p.fmt ?? String;
  return (
    <div className="field">
      <label>{p.label} <span>{fmt(p.value)}</span></label>
      <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} aria-label={p.label} />
      {p.hint && <div className="small muted" style={{ marginTop: 2 }}>{p.hint}</div>}
    </div>
  );
}

function Toggle(p: { label: string; value: boolean; onChange: (b: boolean) => void; on: string; off: string; disabled?: boolean; hint?: string }) {
  return (
    <div className="field">
      <label>{p.label}</label>
      <select value={p.value ? "1" : "0"} disabled={p.disabled} onChange={(e) => p.onChange(e.target.value === "1")}>
        <option value="1">{p.on}</option>
        <option value="0">{p.off}</option>
      </select>
      {p.hint && <div className="small muted" style={{ marginTop: 2 }}>{p.hint}</div>}
    </div>
  );
}

function RateInput(p: { label: string; value: number; step?: number; onChange: (n: number) => void }) {
  return (
    <div className="field">
      <label>{p.label}</label>
      <input type="number" step={p.step ?? "any"} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    </div>
  );
}

/* ---------------- 24h chart ---------------- */

function LoadChart({ res, maxCu }: { res: PricingResult; maxCu: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 280, L = 44, R = 12, T = 14, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const rdsCu = res.hours[0].rdsCu;
  const yMax = Math.max(rdsCu, maxCu, ...res.hours.map((h) => h.demandCu)) * 1.08;
  const x = (h: number) => L + (h / 24) * iw;
  const y = (v: number) => T + ih - (v / yMax) * ih;

  // Step path for billed Lakebase capacity
  let step = `M ${x(0)} ${y(0)}`;
  res.hours.forEach((p) => { step += ` L ${x(p.hour)} ${y(p.lbCu)} L ${x(p.hour + 1)} ${y(p.lbCu)}`; });
  step += ` L ${x(24)} ${y(0)} Z`;
  const stepLine = res.hours.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.hour)} ${y(p.lbCu)} L ${x(p.hour + 1)} ${y(p.lbCu)}`).join(" ");
  const demand = res.hours.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.hour + 0.5)} ${y(p.demandCu)}`).join(" ");

  const ticks: number[] = [];
  const tickStep = yMax > 40 ? 16 : yMax > 20 ? 8 : 4;
  for (let v = 0; v <= yMax; v += tickStep) ticks.push(v);

  const hp = hover !== null ? res.hours[hover] : null;
  const fmtH = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="24-hour load: demand, Lakebase billed capacity and RDS provisioned capacity in CU"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const h = Math.floor(((px - L) / iw) * 24);
          setHover(h >= 0 && h < 24 ? h : null);
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{t}</text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={x(h)} y={H - 12} textAnchor="middle" fontSize={11} fill="var(--muted)">{fmtH(h % 24)}</text>
        ))}
        <text x={12} y={T + ih / 2} fontSize={11} fill="var(--muted)" transform={`rotate(-90 12 ${T + ih / 2})`} textAnchor="middle">CU (≈2 GB RAM each)</text>

        <path d={step} fill="var(--series-1)" opacity={0.16} />
        <path d={stepLine} fill="none" stroke="var(--series-1)" strokeWidth={2} />
        <line x1={L} x2={W - R} y1={y(rdsCu)} y2={y(rdsCu)} stroke="var(--series-2)" strokeWidth={2} strokeDasharray="6 4" />
        <line x1={L} x2={W - R} y1={y(maxCu)} y2={y(maxCu)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="2 4" />
        <text x={W - R - 4} y={y(maxCu) - 5} textAnchor="end" fontSize={11} fill="var(--muted)">Lakebase max CU</text>
        <text x={W - R - 4} y={y(rdsCu) - 5} textAnchor="end" fontSize={11} fill="var(--text-2)">RDS provisioned ({res.rds.instance})</text>
        <path d={demand} fill="none" stroke="var(--text)" strokeWidth={2} />
        {res.hours.map((p) => (
          <circle key={p.hour} cx={x(p.hour + 0.5)} cy={y(p.demandCu)} r={p.capped ? 4 : 0} fill="#e34948" />
        ))}

        {hp && (
          <g>
            <line x1={x(hp.hour + 0.5)} x2={x(hp.hour + 0.5)} y1={T} y2={T + ih} stroke="var(--text-2)" strokeWidth={1} />
            <circle cx={x(hp.hour + 0.5)} cy={y(hp.demandCu)} r={5} fill="var(--text)" stroke="var(--surface)" strokeWidth={2} />
            <circle cx={x(hp.hour + 0.5)} cy={y(hp.lbCu)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && (
        <div style={{
          position: "absolute", top: 8, left: `${Math.min(70, Math.max(8, ((x(hp.hour + 0.5)) / W) * 100 + 2))}%`,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
          fontSize: 12, pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,.08)", minWidth: 190,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{fmtH(hp.hour)}–{fmtH((hp.hour + 1) % 24)}</div>
          <div>Demand: <strong>{hp.demandCu.toFixed(1)} CU</strong> ({(hp.demandCu * 2).toFixed(0)} GB)</div>
          <div>Lakebase billed: <strong>{hp.lbCu} CU</strong>{hp.capped ? " · capped by max" : ""}</div>
          <div>RDS provisioned: <strong>{hp.rdsCu} CU-equiv.</strong></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- breakdown bars ---------------- */

function Breakdown({ title, items, total, color }: { title: string; items: { label: string; lever: string; amount: number }[]; total: number; color: string }) {
  const shown = items.filter((i) => i.amount > 0.5).sort((a, b) => b.amount - a.amount);
  const max = Math.max(...shown.map((i) => i.amount), 1);
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="stat-value" style={{ fontSize: 22 }}>{money(total)}<span className="small muted" style={{ fontWeight: 400 }}> /mo</span></span>
      </div>
      <div className="bars" style={{ marginTop: 14, gap: 10 }}>
        {shown.map((i) => (
          <div key={i.label} title={`${i.label}: ${money(i.amount)} / mo — lever: ${i.lever}`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
              <span>{i.label}</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{money(i.amount)}</strong>
            </div>
            <div style={{ height: 8, marginTop: 4 }}>
              <div style={{ height: "100%", width: `${(i.amount / max) * 100}%`, background: color, borderRadius: "0 4px 4px 0", minWidth: 2 }} />
            </div>
            <div className="small muted" style={{ fontSize: 11.5 }}>Lever: {i.lever} · {Math.round((i.amount / total) * 100)}% of bill</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */

export default function PricingExplorer() {
  const [inp, setInp] = useState<PricingInputs>(DEFAULT_PRICING_INPUTS);
  const [rates, setRates] = useState<PricingRates>(PRICING_RATES);
  const res = useMemo(() => computePricing(inp, rates), [inp, rates]);
  const set = <K extends keyof PricingInputs>(k: K) => (v: PricingInputs[K]) => setInp((s) => ({ ...s, [k]: v }));
  const setR = (k: keyof PricingRates) => (v: number) => setRates((s) => ({ ...s, [k]: v }));

  const profile = PROFILES.find((p) => p.key === inp.profile)!;
  const cuIdx = (v: number) => Math.max(0, CU_SIZES.indexOf(v));
  const diff = res.rds.total - res.lb.total;
  const peakCu = inp.peakGb / rates.lbGbPerCu;
  const utilRds = (res.lb.avgCu / (res.rds.instanceGb / rates.lbGbPerCu));

  return (
    <div>
      <div className="card">
        <div className="controls">
          <div className="field">
            <label>Workload shape</label>
            <select value={inp.profile} onChange={(e) => set("profile")(e.target.value)}>
              {PROFILES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <div className="small muted" style={{ marginTop: 2 }}>{profile.desc}</div>
          </div>
          <Range label="Peak working memory" value={inp.peakGb} min={2} max={64} step={2} fmt={(n) => `${n} GB · ${(n / rates.lbGbPerCu).toFixed(0)} CU`} onChange={set("peakGb")} hint="Size to the hot working set, not total data" />
          <Range label="Operational data size" value={inp.dataGb} min={10} max={4000} step={10} fmt={(n) => `${n.toLocaleString()} GB`} onChange={set("dataGb")} />
          <Range label="Lakebase min CU (baseline)" value={cuIdx(inp.minCu)} min={0} max={CU_SIZES.length - 1} fmt={(i) => `${CU_SIZES[i]} CU`}
            onChange={(i) => { const v = CU_SIZES[i]; setInp((s) => ({ ...s, minCu: v, maxCu: Math.max(s.maxCu, v), })); }} />
          <Range label="Lakebase max CU (ceiling)" value={cuIdx(inp.maxCu)} min={0} max={CU_SIZES.length - 1} fmt={(i) => `${CU_SIZES[i]} CU`}
            onChange={(i) => { const v = CU_SIZES[i]; setInp((s) => ({ ...s, maxCu: v, minCu: Math.min(s.minCu, v) })); }}
            hint={inp.maxCu - inp.minCu > 16 ? "Lakebase limits max − min to 16 CU" : undefined} />
          <Toggle label="Production idle behavior" value={!inp.prodScaleToZero || inp.ha} disabled={inp.ha}
            on="Always-On (25% off baseline)" off="Scale to zero when idle"
            onChange={(b) => set("prodScaleToZero")(!b)} hint={inp.ha ? "HA computes can't scale to zero" : undefined} />
          <Toggle label="High availability" value={inp.ha} on="On (secondary / Multi-AZ)" off="Off" onChange={set("ha")} />
          <Range label="Read replicas" value={inp.readReplicas} min={0} max={3} onChange={set("readReplicas")} />
          <Range label="Dev / test branches (environments)" value={inp.devBranches} min={0} max={20} onChange={set("devBranches")} />
          <Range label="Dev branch size" value={cuIdx(inp.devCu)} min={0} max={8} fmt={(i) => `${CU_SIZES[i]} CU`} onChange={(i) => set("devCu")(CU_SIZES[i])} />
          <Range label="Dev hours actually used / week" value={inp.devHrsWeek} min={5} max={168} step={5} fmt={(n) => `${n} h`} onChange={set("devHrsWeek")} />
          <Range label="Restore window (PITR)" value={inp.pitrDays} min={2} max={30} fmt={(n) => `${n} days`} onChange={set("pitrDays")} />
          <Range label="Data changed per day" value={inp.dailyChangePct} min={0} max={20} step={0.5} fmt={(n) => `${n}%`} onChange={set("dailyChangePct")} />
          <Range label="RDS headroom above peak" value={inp.rdsHeadroomPct} min={0} max={100} step={5} fmt={(n) => `${n}%`} onChange={set("rdsHeadroomPct")} hint="Provisioned databases are sized for peak plus safety margin" />
          <div className="field">
            <label>RDS purchase option</label>
            <select value={inp.rdsPricing} onChange={(e) => set("rdsPricing")(e.target.value as PricingInputs["rdsPricing"])}>
              <option value="od">On-demand</option>
              <option value="ri1">1-yr reserved (~30% off)</option>
              <option value="ri3">3-yr reserved (~55% off)</option>
            </select>
          </div>
          <Toggle label="RDS dev instances" value={inp.rdsDevStopped} on="Stopped off-hours (scheduled)" off="Running 24×7" onChange={set("rdsDevStopped")} />
          <Toggle label="Lakebase promotional discount" value={inp.promo} on="Apply 50% (through Jan 31, 2027)" off="List price" onChange={set("promo")} />
        </div>

        <details className="assumptions">
          <summary>Edit unit rates</summary>
          <div className="controls" style={{ marginTop: 12 }}>
            <RateInput label="Lakebase $/CU-hour (autoscaling)" value={rates.lbCuHr} step={0.001} onChange={setR("lbCuHr")} />
            <RateInput label="Always-On baseline discount (0–1)" value={rates.lbAlwaysOnDisc} step={0.05} onChange={setR("lbAlwaysOnDisc")} />
            <RateInput label="Promo discount (0–1)" value={rates.lbPromoDisc} step={0.05} onChange={setR("lbPromoDisc")} />
            <RateInput label="Lakebase storage $/GB-mo" value={rates.lbStorageGbMo} step={0.005} onChange={setR("lbStorageGbMo")} />
            <RateInput label="Lakebase PITR storage $/GB-mo" value={rates.lbPitrGbMo} step={0.005} onChange={setR("lbPitrGbMo")} />
            <RateInput label="Lakebase snapshot $/GB-mo" value={rates.lbSnapshotGbMo} step={0.005} onChange={setR("lbSnapshotGbMo")} />
            <RateInput label="RDS db.r7g.large $/hr" value={rates.rdsR7gLargeHr} step={0.001} onChange={setR("rdsR7gLargeHr")} />
            <RateInput label="RDS gp3 $/GB-mo" value={rates.rdsGp3GbMo} step={0.005} onChange={setR("rdsGp3GbMo")} />
            <RateInput label="RDS backup $/GB-mo" value={rates.rdsBackupGbMo} step={0.005} onChange={setR("rdsBackupGbMo")} />
          </div>
        </details>
      </div>

      <div className="grid g4" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="stat-label">Lakebase / month</div>
          <div className="stat-value">{money(res.lb.total)}</div>
          <p className="small">avg {res.lb.avgCu.toFixed(1)} CU billed, peak {res.lb.peakBilledCu} CU</p>
        </div>
        <div className="card">
          <div className="stat-label">AWS RDS / month</div>
          <div className="stat-value">{money(res.rds.total)}</div>
          <p className="small">{res.rds.instance} ({res.rds.instanceGb} GB){inp.ha ? " Multi-AZ" : ""}</p>
        </div>
        <div className="card">
          <div className="stat-label">{diff >= 0 ? "Lakebase saves" : "RDS is cheaper by"}</div>
          <div className="stat-value">{money(Math.abs(diff))}</div>
          <p className="small">{Math.round(Math.abs(diff) / Math.max(res.rds.total, 1) * 100)}% per month · {money(Math.abs(diff) * 12)} per year</p>
        </div>
        <div className="card">
          <div className="stat-label">Avg use of RDS capacity</div>
          <div className="stat-value">{Math.round(utilRds * 100)}%</div>
          <p className="small">Lakebase compute wins below ~{Math.round(res.breakEvenUtil * 100)}% at the autoscaling rate</p>
        </div>
      </div>

      {res.lb.capped && (
        <div className="callout" style={{ marginTop: 14 }}>
          Peak demand ({peakCu.toFixed(0)} CU) exceeds the Lakebase max CU ({inp.maxCu}). Red dots mark hours the database would be capacity-constrained. Raise max CU.
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>24-hour load: what each model bills for</h3>
        <div className="legend" style={{ margin: "6px 0 8px" }}>
          <span><i style={{ background: "var(--text)" }} />Actual demand</span>
          <span><i style={{ background: "var(--series-1)" }} />Lakebase billed capacity (autoscaled)</span>
          <span><i style={{ background: "var(--series-2)" }} />RDS provisioned capacity (billed 24×7)</span>
        </div>
        <LoadChart res={res} maxCu={inp.maxCu} />
        <p className="small muted" style={{ marginTop: 6 }}>
          The gap between the dashed orange line and the blue area is capacity RDS bills for but the workload doesn't use. Primary compute only; HA, replicas and dev environments are in the breakdown below.
        </p>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Breakdown title="Lakebase bill" items={res.lb.items} total={res.lb.total} color="var(--series-1)" />
        <Breakdown title="AWS RDS bill" items={res.rds.items} total={res.rds.total} color="var(--series-2)" />
      </div>

      <div className="tbl-wrap" style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead>
            <tr><th>Unit economics (this scenario)</th><th className="num">Lakebase</th><th className="num">AWS RDS</th></tr>
          </thead>
          <tbody>
            <tr><td>Compute $ per GB-RAM-hour</td><td className="num">${res.perGbHr.lbStd.toFixed(4)} autoscaled · ${res.perGbHr.lbBase.toFixed(4)} baseline</td><td className="num">${res.perGbHr.rds.toFixed(4)}</td></tr>
            <tr><td>Hours billed per month (prod)</td><td className="num">Per second, only capacity in use</td><td className="num">730 h at full instance size</td></tr>
            <tr><td>Storage $ per GB-month</td><td className="num">${rates.lbStorageGbMo.toFixed(3)} (shared by HA, replicas, branches)</td><td className="num">${rates.rdsGp3GbMo.toFixed(3)} × every copy</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
