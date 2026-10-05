export type NavItem = { href: string; label: string; short: string };

export const NAV: NavItem[] = [
  { href: "/use-cases/predictive-maintenance", label: "Predictive Maintenance", short: "Use case 1" },
  { href: "/use-cases/quality-traceability", label: "Quality & Traceability", short: "Use case 2" },
  { href: "/use-cases/supply-chain-control-tower", label: "Supply Chain Control Tower", short: "Use case 3" },
  { href: "/use-cases/plant-floor-ai-agents", label: "Plant-Floor AI Agents", short: "Use case 4" },
  { href: "/savings", label: "Cost & Time Savings", short: "Comparison" },
  { href: "/pricing", label: "Pricing Model & Levers", short: "Pricing" },
  { href: "/example-app", label: "Example App", short: "Build it" },
];

export type FlowStep = { title: string; detail: string };
export type Lever = { metric: string; value: string; note: string };

export type UseCase = {
  slug: string;
  index: number;
  title: string;
  tagline: string;
  persona: string;
  problem: string[];
  flow: FlowStep[];
  tables: { name: string; kind: "synced" | "native"; desc: string }[];
  sql: string;
  levers: Lever[];
  whyLakebase: string[];
};

export const USE_CASES: UseCase[] = [
  {
    slug: "predictive-maintenance",
    index: 1,
    title: "Predictive Maintenance & Asset Health",
    tagline:
      "Put the failure predictions you already compute in Databricks in front of the technician who can act on them, and capture the work order in the same place.",
    persona: "Reliability engineers, maintenance planners, line technicians",
    problem: [
      "Failure-risk scores are produced nightly in the lakehouse, but technicians work from a CMMS and paper checklists that never see them.",
      "Getting scores into an app today means a hand-built reverse-ETL job into a separate Postgres or RDS instance, with its own credentials, backups and drift.",
      "Work-order outcomes (what was actually wrong, parts used, time to repair) rarely flow back to retrain the model.",
    ],
    flow: [
      { title: "Sensor & historian data lands in Delta", detail: "Vibration, temperature and PLC tags stream through Lakeflow into bronze/silver tables." },
      { title: "Model scores assets", detail: "An MLflow model writes gold.asset_risk_scores every 15 minutes." },
      { title: "Synced table serves the scores", detail: "A continuous synced table mirrors asset_risk_scores into Lakebase for sub-10ms reads — no custom pipeline." },
      { title: "Technician app writes work orders", detail: "A Databricks App reads risk, lets a tech open, update and close work orders as ACID transactions in native Postgres tables." },
      { title: "Outcomes flow back", detail: "Lakehouse Sync replicates work-order changes to Delta so repair outcomes become training labels." },
    ],
    tables: [
      { name: "asset_risk_scores", kind: "synced", desc: "Per-asset failure probability, top contributing signals, RUL estimate" },
      { name: "asset_master", kind: "synced", desc: "Line, cell, criticality, OEM, install date" },
      { name: "work_orders", kind: "native", desc: "Open/closed WOs, assignee, root cause, parts, labor minutes" },
      { name: "wo_events", kind: "native", desc: "Audit trail of every status change" },
    ],
    sql: `-- Technician "my shift" view: highest-risk assets without an open work order
SELECT a.asset_id, a.line, s.failure_prob, s.top_signal, s.rul_hours
FROM   asset_risk_scores s
JOIN   asset_master a USING (asset_id)
LEFT JOIN work_orders w
       ON w.asset_id = s.asset_id AND w.status IN ('open','in_progress')
WHERE  a.plant = $1 AND w.wo_id IS NULL
ORDER  BY s.failure_prob DESC
LIMIT  20;`,
    levers: [
      { metric: "Unplanned downtime", value: "-15–30%", note: "Typical range cited for condition-based maintenance programs; validate against your baseline" },
      { metric: "Mean time to repair", value: "-10–20%", note: "Tech arrives knowing the likely failure mode and parts" },
      { metric: "Model feedback loop", value: "Weeks → hours", note: "Work-order outcomes land in Delta automatically" },
    ],
    whyLakebase: [
      "Scores never leave Unity Catalog governance — the same grants cover the lakehouse and the app.",
      "Synced tables replace the reverse-ETL job you would otherwise build and babysit for RDS.",
      "Scale-to-zero branches let each developer test against a copy of production data for cents.",
    ],
  },
  {
    slug: "quality-traceability",
    index: 2,
    title: "Quality, Genealogy & Traceability",
    tagline:
      "Answer \"which finished units contain this suspect lot?\" in milliseconds on the shop floor, and record holds and dispositions transactionally.",
    persona: "Quality engineers, plant QA, customer-quality / recall teams",
    problem: [
      "Genealogy lives in Delta tables that are excellent for analytics but not for a clerk scanning a serial number at a workstation.",
      "Hold / release / scrap decisions are captured in spreadsheets or a separate MES database with no link back to SPC analytics.",
      "In a containment event, every hour spent reconciling systems is more suspect product shipped.",
    ],
    flow: [
      { title: "Build genealogy in the lakehouse", detail: "Lakeflow joins MES, ERP and supplier-lot data into gold.unit_genealogy." },
      { title: "SPC & anomaly detection", detail: "Streaming jobs flag out-of-control characteristics into gold.quality_alerts." },
      { title: "Serve with synced tables", detail: "Genealogy and alerts sync to Lakebase with indexed lookups by serial, lot and work center." },
      { title: "Disposition app", detail: "Quality engineers place holds, record MRB decisions and sign-offs in native tables with row-level locking." },
      { title: "Close the loop", detail: "Dispositions replicate to Delta for Pareto, COPQ and supplier scorecards in AI/BI dashboards." },
    ],
    tables: [
      { name: "unit_genealogy", kind: "synced", desc: "Serial → component lots → supplier, line, timestamp" },
      { name: "quality_alerts", kind: "synced", desc: "SPC rule violations and anomaly scores" },
      { name: "holds", kind: "native", desc: "Active holds with scope (lot, serial range, work center)" },
      { name: "dispositions", kind: "native", desc: "MRB decisions, signatures, rework instructions" },
    ],
    sql: `-- Containment: every shipped-or-not unit built with a suspect supplier lot
SELECT g.serial_no, g.line, g.built_at, g.ship_status
FROM   unit_genealogy g
WHERE  g.component_lot = ANY($1::text[])
AND    NOT EXISTS (SELECT 1 FROM holds h WHERE h.serial_no = g.serial_no);

-- Place the hold atomically
INSERT INTO holds (serial_no, reason, placed_by)
SELECT serial_no, 'Supplier lot containment', $2
FROM   unit_genealogy WHERE component_lot = ANY($1::text[])
ON CONFLICT DO NOTHING;`,
    levers: [
      { metric: "Containment scoping time", value: "Days → minutes", note: "Genealogy lookup served directly from Lakebase" },
      { metric: "Cost of poor quality", value: "-5–15%", note: "Earlier holds, less rework and field escape; illustrative range" },
      { metric: "Audit readiness", value: "Single lineage", note: "Unity Catalog lineage from sensor to disposition" },
    ],
    whyLakebase: [
      "Point lookups by serial are an OLTP job — Lakebase handles them without warming a SQL warehouse.",
      "Holds and dispositions need ACID transactions and constraints that Delta tables aren't designed to serve interactively.",
      "Instant point-in-time restore protects a regulated record of quality decisions.",
    ],
  },
  {
    slug: "supply-chain-control-tower",
    index: 3,
    title: "Supply Chain & Inventory Control Tower",
    tagline:
      "Give planners a live, writable view of inventory, supplier risk and allocations — built on the forecasts and risk models already in Databricks.",
    persona: "Supply planners, buyers, S&OP leads",
    problem: [
      "Demand forecasts and supplier-risk scores are computed in Databricks, then exported to Excel for planners to act on.",
      "Planner decisions (reallocations, expedites, safety-stock overrides) are lost or re-keyed into ERP days later.",
      "Standing up a separate operational database for the planning app duplicates data and access controls.",
    ],
    flow: [
      { title: "Forecast & risk in the lakehouse", detail: "Demand forecasts, on-hand/in-transit inventory and supplier risk land in gold tables." },
      { title: "Sync the planning slice", detail: "Only the tables planners need are synced into Lakebase on a triggered or continuous schedule." },
      { title: "Planner workspace app", detail: "Planners commit reallocations and overrides with optimistic locking so two planners can't double-allocate." },
      { title: "Agentic suggestions", detail: "An Agent Bricks agent proposes rebalancing moves; planners accept or reject in the app." },
      { title: "Decisions feed ERP & analytics", detail: "Accepted moves replicate to Delta for ERP integration and forecast-accuracy tracking." },
    ],
    tables: [
      { name: "inventory_position", kind: "synced", desc: "SKU × site on-hand, in-transit, days of cover" },
      { name: "supplier_risk", kind: "synced", desc: "Risk score, OTIF trend, geo exposure" },
      { name: "allocations", kind: "native", desc: "Planner-committed moves with version column" },
      { name: "overrides", kind: "native", desc: "Safety-stock and forecast overrides with reason codes" },
    ],
    sql: `-- Commit a reallocation only if nobody else changed it first
UPDATE allocations
SET    qty = $3, updated_by = $4, version = version + 1
WHERE  allocation_id = $1 AND version = $2
RETURNING *;`,
    levers: [
      { metric: "Expedite / premium freight", value: "-10–25%", note: "Illustrative; earlier visibility of shortages" },
      { metric: "Working capital in inventory", value: "-5–10%", note: "Illustrative; tighter safety-stock decisions" },
      { metric: "Planner time on data wrangling", value: "-50%+", note: "No more export-to-Excel cycles" },
    ],
    whyLakebase: [
      "Planners write back without a second database, a second IAM model or a second backup policy.",
      "Autoscaling absorbs the Monday-morning planning spike and scales down overnight.",
      "Branches give S&OP a what-if copy of the plan without duplicating storage.",
    ],
  },
  {
    slug: "plant-floor-ai-agents",
    index: 4,
    title: "Plant-Floor AI Agents & Operator Copilot",
    tagline:
      "Give operators a copilot that knows your SOPs, your machines and this shift's context — with memory and state stored in governed Postgres.",
    persona: "Operators, shift supervisors, process engineers",
    problem: [
      "Tribal knowledge lives in PDFs, SOP binders and the heads of senior operators.",
      "Agents need fast, transactional state (conversation memory, tool results, shift handoffs) that analytics tables don't provide.",
      "Security teams won't approve an AI assistant whose data sits outside the governed platform.",
    ],
    flow: [
      { title: "Index SOPs and manuals", detail: "Documents are parsed in Databricks; embeddings are stored with pgvector in Lakebase or in Vector Search." },
      { title: "Serve live machine context", detail: "Current line status and recent alarms sync from Delta for the agent to ground answers in." },
      { title: "Agent state in Postgres", detail: "Sessions, memory, tool calls and shift-handoff notes are native Lakebase tables." },
      { title: "Guardrailed actions", detail: "The agent can draft a work order or a hold — a human confirms and the write is transactional." },
      { title: "Evaluate & improve", detail: "Conversations replicate to Delta for MLflow evaluation and continuous improvement." },
    ],
    tables: [
      { name: "sop_chunks", kind: "native", desc: "Chunked SOP text with vector(1024) embeddings" },
      { name: "line_status", kind: "synced", desc: "Current state, OEE, active alarms per line" },
      { name: "agent_sessions", kind: "native", desc: "Operator, line, shift, conversation memory" },
      { name: "shift_handoffs", kind: "native", desc: "Structured notes the agent drafts at end of shift" },
    ],
    sql: `-- Retrieve the SOP passages most relevant to the operator's question
SELECT doc_title, section, chunk_text
FROM   sop_chunks
WHERE  line_family = $2
ORDER  BY embedding <=> $1::vector
LIMIT  5;`,
    levers: [
      { metric: "Time to resolve line stoppages", value: "-10–25%", note: "Illustrative; faster access to the right procedure" },
      { metric: "New-operator ramp time", value: "-20–40%", note: "Illustrative; guided, context-aware answers" },
      { metric: "Shift-handoff quality", value: "Structured", note: "Consistent, searchable handoff records" },
    ],
    whyLakebase: [
      "Agent state is transactional by nature; Lakebase is Postgres, so standard agent frameworks work unchanged.",
      "pgvector is available, so small-to-mid retrieval workloads don't need yet another service.",
      "Everything the agent reads and writes is governed and lineage-tracked in Unity Catalog.",
    ],
  },
];
