import Link from "next/link";
import { PawPrint, Users, Droplets, Zap } from "lucide-react";

const CATEGORIES = [
  {
    label: "Pet-friendly",
    href: "/vans?petFriendly=1",
    body: "Vans that welcome your dog along for the ride.",
    icon: <PawPrint size={22} />,
  },
  {
    label: "Family-size (sleeps 4+)",
    href: "/vans?sleeps=4",
    body: "Plenty of room for the whole crew.",
    icon: <Users size={22} />,
  },
  {
    label: "Self-contained",
    href: "/vans?vanType=self-contained",
    body: "Freedom-camp anywhere certified parking is allowed.",
    icon: <Droplets size={22} />,
  },
  {
    label: "Instant book",
    href: "/vans?instantBook=1",
    body: "Confirmed bookings without waiting for host approval.",
    icon: <Zap size={22} />,
  },
];

export default function CategoryCards() {
  return (
    <section className="bg-cream py-[clamp(3rem,6vw,5rem)]">
      <div className="wrap">
        <div className="mb-[clamp(2rem,4vw,3rem)] text-center">
          <h2 className="mb-3 text-[clamp(1.8rem,3vw,2.4rem)]">Find your kind of trip</h2>
          <p className="mx-auto max-w-[48ch] text-stone">
            Whether it&apos;s a weekend with the dog or a month-long family expedition.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="cs-card group block p-6 no-underline transition-transform hover:-translate-y-0.5"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-[var(--radius)] border border-line bg-sand text-clay transition-colors group-hover:border-clay/40 group-hover:bg-clay/8">
                {c.icon}
              </div>
              <h3 className="mb-1.5 text-[1.05rem] text-forest-deep">{c.label}</h3>
              <p className="m-0 text-sm text-stone">{c.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
