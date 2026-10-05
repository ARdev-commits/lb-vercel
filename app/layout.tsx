import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lakebase for Manufacturing",
  description:
    "Four high-value Lakebase use cases for a Databricks manufacturing customer, a cost and time comparison against standalone Postgres and AWS RDS, and an example app built with AI dev tools.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand">
              <div className="brand-mark">LB</div>
              <div>
                <div className="brand-name">Lakebase for Manufacturing</div>
                <div className="brand-sub">Operational data on your lakehouse</div>
              </div>
            </Link>
            <Nav />
            <div className="sidebar-foot">
              Figures marked illustrative are directional estimates. Validate rates at databricks.com/product/pricing/lakebase and aws.amazon.com/rds/postgresql/pricing.
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
