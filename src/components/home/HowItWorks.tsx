import { Search, CalendarCheck, MapPin } from "lucide-react";

const STEPS = [
  {
    icon: <Search size={22} />,
    title: "Search",
    body: "Filter by region, dates, sleeps and features. Find a van that fits your trip.",
  },
  {
    icon: <CalendarCheck size={22} />,
    title: "Book",
    body: "Send a request to the host. Pay securely — your card is only charged when they accept.",
  },
  {
    icon: <MapPin size={22} />,
    title: "Hit the road",
    body: "Meet the owner, pick up the van, and head off on your Aotearoa adventure.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-cream py-[clamp(3rem,6vw,5rem)]">
      <div className="wrap">
        <div className="mb-[clamp(2rem,4vw,3rem)] text-center">
          <h2 className="mb-3 text-[clamp(1.8rem,3vw,2.4rem)]">How CampShare works</h2>
          <p className="mx-auto max-w-[48ch] text-stone">
            Three simple steps between you and a Kiwi road trip.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="surface-card flex flex-col items-center p-8 text-center"
            >
              <div className="mb-4 flex size-[52px] items-center justify-center rounded-full border-[1.5px] border-ochre bg-forest-deep text-cream">
                {s.icon}
              </div>
              <h3 className="mb-2 font-serif text-[1.1rem] text-forest-deep">{s.title}</h3>
              <p className="m-0 text-stone">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
