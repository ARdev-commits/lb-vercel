"use client";

import { useMemo, useState } from "react";
import {
  compute, DEFAULT_EFFORT, DEFAULT_INPUTS, DEFAULT_RATES, OPTIONS, usd,
  type Effort, type Inputs, type OptionKey, type Rates, type Result,
} from "@/lib/costModel";

function Slider(props: { label: string; value: number; min: number; max: number; step?: number; fmt?: (n: number) => string; onChange: (n: number) => void }) {
  const { label, value, min, max, step = 1, fmt = (n) => String(n), onChange } = props;
  return (
    <div className="field">
      <label>
        {label} <span>{fmt(value)}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

function Num(props: { label: string; value: number; step?: number; onChange: (n: number) => void }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <input type="number" step={props.step ?? "any"} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
    </div>
  );
}

function Bars({ title, results, pick, fmt }: { title: string; results: Result[]; pick: (r: Result) => number; fmt: (n: number) => string }) {
  const max = Math.max(...results.map(pick), 1);
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="bars" style={{ marginTop: 12 }}>
        {results.map((r) => {
          const o = OPTIONS.find((x) => x.key === r.key)!;
          const v = pick(r);
          return (
            <div className="bar-row" key={r.key} title={`${o.label}: ${fmt(v)}`}>
              <span className="small">{o.label.replace(" (self-managed)", "")}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(v / max) * 100}%`, background: o.color }} />
              </div>
              <span className="v">{fmt(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SavingsCalculator() {
  const [inp, setInp] = useState<Inputs>(DEFAULT_INPUTS);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [effort, setEffort] = useState<Record<OptionKey, Effort>>(DEFAULT_EFFORT);

  const results = useMemo(() => compute(inp, rates, effort), [inp, rates, effort]);
  const lb = results.find((r) => r.key === "lakebase")!;
  const rds = results.find((r) => r.key === "rds")!;
  const self = results.find((r) => r.key === "self")!;

  const set = <K extends keyof Inputs>(k: K) => (v: Inputs[K]) => setInp((s) => ({ ...s, [k]: v }));
  const setR = <K extends keyof Rates>(k: K) => (v: number) => setRates((s) => ({ ...s, [k]: v }));
  const setE = (o: OptionKey, k: keyof Effort) => (v: number) => setEffort((s) => ({ ...s, [o]: { ...s[o], [k]: v } }));

  const pct = (a: number, b: number) => `${Math.round((1 - a / b) * 100)}%`;

  const rows: { label: string; pick: (r: Result) => number; fmt?: (n: number) => string; hl?: boolean }[] = [
    { label: "Prod compute / mo", pick: (r) => r.prodCompute },
    { label: "Dev & test compute / mo", pick: (r) => r.nonProdCompute },
    { label: "Storage (all envs) / mo", pick: (r) => r.storage },
    { label: "Lakehouse → DB data movement / mo", pick: (r) => r.dataMovement },
    { label: "Infrastructure / mo", pick: (r) => r.infraMo, hl: true },
    { label: "Ops & pipeline labor / mo", pick: (r) => r.laborMo },
    { label: "Total run cost / mo", pick: (r) => r.runMo, hl: true },
    { label: "One-time build (engineering hours)", pick: (r) => r.buildHrs, fmt: (n) => `${Math.round(n).toLocaleString()} h` },
    { label: "One-time build cost", pick: (r) => r.buildCost },
    { label: `${inp.years}-year TCO`, pick: (r) => r.tco, hl: true },
  ];

  return (
    <div>
      <div className="grid g4">
        <div className="card">
          <div className="stat-label">{inp.years}-yr TCO vs RDS</div>
          <div className="stat-value">{usd(rds.tco - lb.tco)}</div>
          <p className="small">{pct(lb.tco, rds.tco)} lower with Lakebase</p>
        </div>
        <div className="card">
          <div className="stat-label">{inp.years}-yr TCO vs self-managed</div>
          <div className="stat-value">{usd(self.tco - lb.tco)}</div>
          <p className="small">{pct(lb.tco, self.tco)} lower with Lakebase</p>
        </div>
        <div className="card">
          <div className="stat-label">Time to first production app</div>
          <div className="stat-value">{lb.buildWeeks.toFixed(1)} wks</div>
          <p className="small">vs {rds.buildWeeks.toFixed(1)} (RDS) · {self.buildWeeks.toFixed(1)} (self-managed)</p>
        </div>
        <div className="card">
          <div className="stat-label">Engineering hours avoided</div>
          <div className="stat-value">{Math.round(rds.buildHrs - lb.buildHrs).toLocaleString()} h</div>
          <p className="small">up front vs RDS, plus {Math.round((rds.laborMo - lb.laborMo) / inp.engRate)} h every month</p>
        </div>
      </div>

      <h2>Your scenario</h2>
      <div className="card">
        <div className="controls">
          <Slider label="Prod peak memory" value={inp.prodPeakGb} min={8} max={256} step={8} fmt={(n) => `${n} GB`} onChange={set("prodPeakGb")} />
          <Slider label="Baseline load (% of peak)" value={inp.baselinePct} min={10} max={100} step={5} fmt={(n) => `${n}%`} onChange={set("baselinePct")} />
          <Slider label="Hours above baseline" value={inp.burstHoursPct} min={0} max={100} step={5} fmt={(n) => `${n}%`} onChange={set("burstHoursPct")} />
          <Slider label="Dev / test / staging environments" value={inp.nonProdEnvs} min={0} max={20} onChange={set("nonProdEnvs")} />
          <Slider label="Non-prod hours used per week" value={inp.nonProdHrsWeek} min={5} max={168} step={5} fmt={(n) => `${n} h`} onChange={set("nonProdHrsWeek")} />
          <Slider label="Operational data size" value={inp.dataGb} min={10} max={5000} step={10} fmt={(n) => `${n.toLocaleString()} GB`} onChange={set("dataGb")} />
          <Slider label="Lakehouse → app data feeds" value={inp.pipelines} min={1} max={30} onChange={set("pipelines")} />
          <Slider label="Engineer cost (fully loaded)" value={inp.engRate} min={50} max={250} step={5} fmt={(n) => `$${n}/h`} onChange={set("engRate")} />
          <Slider label="TCO horizon" value={inp.years} min={1} max={5} fmt={(n) => `${n} yr`} onChange={set("years")} />
          <div className="field">
            <label>Engineers on the build</label>
            <select value={inp.teamSize} onChange={(e) => set("teamSize")(Number(e.target.value))}>
              {[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field">
            <label>High availability for prod</label>
            <select value={inp.ha ? "yes" : "no"} onChange={(e) => set("ha")(e.target.value === "yes")}>
              <option value="yes">Yes (standby / secondary)</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <details className="assumptions">
          <summary>Edit price and effort assumptions</summary>
          <p className="small muted" style={{ margin: "10px 0 14px" }}>
            Defaults are illustrative list-price style figures. Replace them with your contracted Databricks rate (Lakebase draws on your existing commit on most plans) and your AWS pricing.
          </p>
          <div className="controls">
            <Num label="Lakebase $/CU-hr" value={rates.lbCuHr} step={0.01} onChange={setR("lbCuHr")} />
            <Num label="GB RAM per Lakebase CU" value={rates.lbGbPerCu} onChange={setR("lbGbPerCu")} />
            <Num label="Always-On baseline discount (0–1)" value={rates.lbAlwaysOnDisc} step={0.05} onChange={setR("lbAlwaysOnDisc")} />
            <Num label="Lakebase storage $/GB-mo" value={rates.lbStorageGbMo} step={0.01} onChange={setR("lbStorageGbMo")} />
            <Num label="Synced table compute $/feed-mo" value={rates.lbSyncMo} onChange={setR("lbSyncMo")} />
            <Num label="Branch data changed (%)" value={rates.lbBranchChangePct} onChange={setR("lbBranchChangePct")} />
            <Num label="RDS $/GB-RAM-hr" value={rates.rdsGbHr} step={0.001} onChange={setR("rdsGbHr")} />
            <Num label="RDS storage $/GB-mo" value={rates.rdsStorageGbMo} step={0.005} onChange={setR("rdsStorageGbMo")} />
            <Num label="EC2 $/GB-RAM-hr" value={rates.ec2GbHr} step={0.001} onChange={setR("ec2GbHr")} />
            <Num label="EBS $/GB-mo" value={rates.ebsGbMo} step={0.005} onChange={setR("ebsGbMo")} />
            <Num label="Custom reverse-ETL $/feed-mo" value={rates.etlMo} onChange={setR("etlMo")} />
          </div>
          <div className="tbl-wrap" style={{ marginTop: 16 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Effort (hours)</th>
                  {OPTIONS.map((o) => <th key={o.key}>{o.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {([
                  ["opsHrsMo", "Ops per month (patching, upgrades, backups, on-call)"],
                  ["pipeMaintHrsMo", "Maintenance per feed per month"],
                  ["pipeBuildHrs", "Build per feed"],
                  ["envSetupHrs", "Set up each dev/test environment"],
                  ["platformHrs", "DB platform: network, IAM, secrets, backup, monitoring"],
                  ["appPlatformHrs", "App platform: hosting, SSO, CI/CD"],
                ] as [keyof Effort, string][]).map(([k, label]) => (
                  <tr key={k}>
                    <td className="small">{label}</td>
                    {OPTIONS.map((o) => (
                      <td key={o.key}>
                        <input className="input" type="number" value={effort[o.key][k]} onChange={(e) => setE(o.key, k)(Number(e.target.value))} aria-label={`${label} — ${o.label}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <h2>Results</h2>
      <div className="legend" style={{ marginBottom: 12 }}>
        {OPTIONS.map((o) => (
          <span key={o.key}><i style={{ background: o.color }} />{o.label}</span>
        ))}
      </div>
      <div className="grid g2">
        <Bars title={`${inp.years}-year total cost of ownership`} results={results} pick={(r) => r.tco} fmt={usd} />
        <Bars title="Calendar weeks to first production app" results={results} pick={(r) => r.buildWeeks} fmt={(n) => `${n.toFixed(1)} wks`} />
      </div>

      <h3 style={{ marginTop: 24 }}>Breakdown</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Line item</th>
              {OPTIONS.map((o) => <th key={o.key} className="num">{o.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={row.hl ? "hl" : ""}>
                <td>{row.label}</td>
                {results.map((r) => (
                  <td key={r.key} className="num">{(row.fmt ?? usd)(row.pick(r))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
