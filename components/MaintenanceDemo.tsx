"use client";

import { useState } from "react";

type Asset = { id: string; line: string; name: string; risk: number; signal: string; rul: number };
type WO = { id: number; asset: string; status: "open" | "in_progress" | "closed"; tech: string; cause?: string };

const ASSETS: Asset[] = [
  { id: "PMP-2217", line: "Line 3 · Paint", name: "Circulation pump", risk: 0.87, signal: "Bearing vibration ↑ 3.1σ", rul: 36 },
  { id: "CNV-0412", line: "Line 1 · Assembly", name: "Main conveyor drive", risk: 0.74, signal: "Motor current drift", rul: 70 },
  { id: "CMP-0098", line: "Utilities", name: "Air compressor #2", risk: 0.61, signal: "Discharge temp ↑", rul: 120 },
  { id: "RBT-1330", line: "Line 2 · Weld", name: "Weld robot J4 axis", risk: 0.44, signal: "Torque ripple", rul: 210 },
  { id: "PRS-0703", line: "Line 4 · Stamping", name: "Hydraulic press", risk: 0.22, signal: "Normal", rul: 600 },
];

const TECHS = ["J. Alvarez", "M. Chen", "R. Okafor"];

export default function MaintenanceDemo() {
  const [wos, setWos] = useState<WO[]>([]);
  const [log, setLog] = useState<string[]>([
    "-- asset_risk_scores synced from main.reliability.asset_risk_scores (continuous)",
  ]);
  const [nextId, setNextId] = useState(1001);

  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 8));
  const openFor = (a: string) => wos.find((w) => w.asset === a && w.status !== "closed");

  const create = (a: Asset) => {
    const tech = TECHS[nextId % TECHS.length];
    setWos((w) => [...w, { id: nextId, asset: a.id, status: "open", tech }]);
    push(`INSERT INTO work_orders (wo_id, asset_id, status, assignee) VALUES (${nextId}, '${a.id}', 'open', '${tech}');`);
    setNextId((n) => n + 1);
  };
  const advance = (wo: WO) => {
    const status = wo.status === "open" ? "in_progress" : "closed";
    const cause = status === "closed" ? "Bearing replaced" : undefined;
    setWos((w) => w.map((x) => (x.id === wo.id ? { ...x, status, cause } : x)));
    push(
      `BEGIN; UPDATE work_orders SET status='${status}'${cause ? `, root_cause='${cause}'` : ""} WHERE wo_id=${wo.id}; INSERT INTO wo_events ...; COMMIT;`
    );
  };

  const riskColor = (r: number) => (r >= 0.7 ? "#d9480f" : r >= 0.5 ? "#c98500" : "var(--muted)");
  const riskLabel = (r: number) => (r >= 0.7 ? "High" : r >= 0.5 ? "Elevated" : "Normal");

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong>Shift Maintenance Copilot</strong>
          <div className="small muted">Plant 07 · Shift B · demo data</div>
        </div>
        <span className="pill"><span className="dot" style={{ background: "var(--native)" }} />Connected to Lakebase (simulated)</span>
      </div>

      <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Failure risk</th>
              <th>Top signal</th>
              <th className="num">RUL (h)</th>
              <th>Work order</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a) => {
              const wo = openFor(a.id);
              const closed = wos.filter((w) => w.asset === a.id && w.status === "closed").length;
              return (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                    <div className="small muted">{a.id} · {a.line}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: riskColor(a.risk) }}>{Math.round(a.risk * 100)}%</span>{" "}
                    <span className="small muted">{riskLabel(a.risk)}</span>
                  </td>
                  <td className="small">{a.signal}</td>
                  <td className="num">{a.rul}</td>
                  <td>
                    {wo ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="pill">WO-{wo.id} · {wo.status.replace("_", " ")} · {wo.tech}</span>
                        <button className="btn" onClick={() => advance(wo)}>{wo.status === "open" ? "Start" : "Close"}</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button className="btn primary" onClick={() => create(a)} disabled={a.risk < 0.3}>Create WO</button>
                        {closed > 0 && <span className="small muted">{closed} closed</span>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
        <p className="code-label">Statements the app sends to Lakebase</p>
        <pre className="code" style={{ fontSize: 12, maxHeight: 190 }}>{log.join("\n")}</pre>
      </div>
    </div>
  );
}
