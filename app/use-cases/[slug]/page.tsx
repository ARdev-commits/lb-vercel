import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { USE_CASES } from "@/lib/content";
import Pager from "@/components/Pager";

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const uc = USE_CASES.find((u) => u.slug === slug);
  return { title: uc ? `${uc.title} · Lakebase for Manufacturing` : "Lakebase for Manufacturing" };
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uc = USE_CASES.find((u) => u.slug === slug);
  if (!uc) notFound();

  return (
    <article>
      <div className="eyebrow">High-value use case {uc.index} of 4</div>
      <h1>{uc.title}</h1>
      <p className="lede">{uc.tagline}</p>
      <p className="meta">Who uses it: {uc.persona}</p>

      <h2>Value levers</h2>
      <div className="grid g3">
        {uc.levers.map((l) => (
          <div className="card" key={l.metric}>
            <div className="stat-label">{l.metric}</div>
            <div className="stat-value">{l.value}</div>
            <p className="small">{l.note}</p>
          </div>
        ))}
      </div>

      <h2>The problem today</h2>
      <ul className="bullets">
        {uc.problem.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h2>How it works on Databricks + Lakebase</h2>
      <div className="flow">
        {uc.flow.map((s) => (
          <div className="step" key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.detail}</p>
          </div>
        ))}
      </div>

      <h2>Data model</h2>
      <div className="grid g2">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Table</th>
                <th>Type</th>
                <th>Holds</th>
              </tr>
            </thead>
            <tbody>
              {uc.tables.map((t) => (
                <tr key={t.name}>
                  <td><code>{t.name}</code></td>
                  <td>
                    <span className="pill">
                      <span className="dot" style={{ background: t.kind === "synced" ? "var(--synced)" : "var(--native)" }} />
                      {t.kind === "synced" ? "Synced from Delta" : "Native Postgres"}
                    </span>
                  </td>
                  <td className="small">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="code-label">Example query the app runs against Lakebase</p>
          <pre className="code">{uc.sql}</pre>
        </div>
      </div>

      <h2>Why Lakebase instead of a separate Postgres / RDS</h2>
      <div className="grid g3">
        {uc.whyLakebase.map((w, i) => (
          <div className="card" key={i}>
            <p>{w}</p>
          </div>
        ))}
      </div>

      <Pager current={`/use-cases/${uc.slug}`} />
    </article>
  );
}
