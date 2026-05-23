import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  icon: React.ReactNode;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}

export default function EmptyState({ icon, heading, body, cta }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="mb-1 text-stone opacity-60">{icon}</div>
      <h3 className="m-0 font-serif text-lg text-charcoal">{heading}</h3>
      <p className="m-0 max-w-[36ch] text-sm text-stone">{body}</p>
      {cta && (
        <Link href={cta.href} className={cn(buttonVariants(), "mt-2")}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
