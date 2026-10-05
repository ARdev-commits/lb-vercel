"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/content";

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Sections">
      {NAV.map((item, i) => {
        const active = path === item.href || (path === "/" && i === 0);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <span className="num">{i + 1}</span>
            <span className="lbl">
              <small>{item.short}</small>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
