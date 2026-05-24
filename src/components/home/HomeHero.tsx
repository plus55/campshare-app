import { NZ_REGIONS } from "@/lib/constants";

export default function HomeHero() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="border-b border-line bg-gradient-to-b from-cream to-sand py-[clamp(3rem,8vw,6rem)] pb-[clamp(3.5rem,9vw,7rem)]">
      <div className="wrap text-center">
        <h1 className="mx-auto mb-4 max-w-[18ch] text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.1]">
          Hire a campervan from a local in Aotearoa
        </h1>
        <p className="mx-auto mb-10 max-w-[52ch] text-[clamp(1rem,1.6vw,1.2rem)] text-charcoal-soft">
          Skip the rental fleet. Book direct from owners across New Zealand &mdash;
          characterful vans, real people, fair prices.
        </p>

        <form
          action="/vans"
          method="get"
          className="mx-auto grid max-w-[760px] grid-cols-1 items-center overflow-hidden rounded-2xl border border-line bg-cream p-2 shadow-[0_12px_40px_-16px_rgba(31,42,32,0.18)] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:rounded-full"
        >
          <div className="flex flex-col border-b border-line px-4 py-2 text-left sm:rounded-l-full sm:border-b-0">
            <label htmlFor="hero-region" className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-stone">
              Region
            </label>
            <select
              id="hero-region"
              name="region"
              defaultValue=""
              className="w-full border-0 bg-transparent py-0.5 font-sans text-[0.95rem] text-forest-deep outline-none"
            >
              <option value="">Anywhere in NZ</option>
              {NZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col border-b border-line px-4 py-2 text-left sm:border-b-0 sm:border-l sm:border-l-line">
            <label htmlFor="hero-start-date" className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-stone">
              Check in
            </label>
            <input
              id="hero-start-date"
              type="date"
              name="startDate"
              min={today}
              className="w-full border-0 bg-transparent py-0.5 font-sans text-[0.95rem] text-forest-deep outline-none"
            />
          </div>

          <div className="flex flex-col border-b border-line px-4 py-2 text-left sm:border-b-0 sm:border-l sm:border-l-line">
            <label htmlFor="hero-end-date" className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-stone">
              Check out
            </label>
            <input
              id="hero-end-date"
              type="date"
              name="endDate"
              min={today}
              className="w-full border-0 bg-transparent py-0.5 font-sans text-[0.95rem] text-forest-deep outline-none"
            />
          </div>

          <div className="px-1 pt-2 sm:pt-0">
            <button
              type="submit"
              className="w-full rounded-full bg-clay px-6 py-3 font-sans text-[0.95rem] font-semibold text-cream transition-colors hover:bg-clay-deep sm:w-auto"
            >
              Find a van
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
