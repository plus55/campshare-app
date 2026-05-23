import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  href?: string;
  warn?: boolean;
}

export default function StatTile({ label, value, sub, icon, href, warn }: Props) {
  const inner = (
    <div className={cn(
      "flex flex-col gap-1 rounded-2xl border border-line bg-cream px-6 py-5 transition-shadow hover:shadow",
    )}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-stone">
        {icon}
        {label}
      </div>
      <div className={cn(
        "font-serif text-[2rem] font-medium leading-[1.1]",
        warn ? "text-clay" : "text-charcoal",
      )}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-stone">{sub}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
