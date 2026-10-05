import Link from "next/link";
import { NAV } from "@/lib/content";

export default function Pager({ current }: { current: string }) {
  const i = NAV.findIndex((n) => n.href === current);
  const prev = i > 0 ? NAV[i - 1] : null;
  const next = i < NAV.length - 1 ? NAV[i + 1] : null;
  return (
    <div className="pager">
      {prev && (
        <Link href={prev.href}>
          <small>← Previous</small>
          {prev.label}
        </Link>
      )}
      {next && (
        <Link href={next.href} className="next">
          <small>Next →</small>
          {next.label}
        </Link>
      )}
    </div>
  );
}
