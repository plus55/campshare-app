import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-forest-deep text-cream/75 pt-16 pb-8 text-[0.92rem]">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">

        <div className="grid grid-cols-1 gap-8 pb-12 border-b border-cream/15
          sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-12">

          {/* Brand column */}
          <div>
            <div className="flex items-center gap-[0.6rem] mb-5">
              <span className="brand-mark" style={{ width: 30, height: 30 }} aria-hidden="true" />
              <strong className="font-serif text-[1.3rem] text-cream font-medium">CampShare</strong>
            </div>
            <p className="text-cream/60 max-w-[28ch] text-[0.9rem] leading-relaxed m-0">
              A community of Kiwi campervan owners sharing their hand-built homes with travellers.
            </p>
          </div>

          {/* Hire */}
          <div>
            <h5 className="font-sans text-[0.75rem] tracking-[0.18em] uppercase text-ochre font-semibold mb-4">Hire</h5>
            <ul className="list-none flex flex-col gap-[0.65rem] m-0 p-0">
              <li><Link href="/vans" className="text-cream/78 hover:text-cream transition-colors">All vans</Link></li>
              <li><Link href="/hire/auckland" className="text-cream/78 hover:text-cream transition-colors">Auckland</Link></li>
              <li><Link href="/hire/queenstown" className="text-cream/78 hover:text-cream transition-colors">Queenstown</Link></li>
              <li><Link href="/hire/christchurch" className="text-cream/78 hover:text-cream transition-colors">Christchurch</Link></li>
            </ul>
          </div>

          {/* Own */}
          <div>
            <h5 className="font-sans text-[0.75rem] tracking-[0.18em] uppercase text-ochre font-semibold mb-4">Own</h5>
            <ul className="list-none flex flex-col gap-[0.65rem] m-0 p-0">
              <li><Link href="/apply" className="text-cream/78 hover:text-cream transition-colors">List your van</Link></li>
              <li><a href="https://www.campshare.co.nz/buyback" className="text-cream/78 hover:text-cream transition-colors">Buyback</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-sans text-[0.75rem] tracking-[0.18em] uppercase text-ochre font-semibold mb-4">Company</h5>
            <ul className="list-none flex flex-col gap-[0.65rem] m-0 p-0">
              <li><a href="https://www.campshare.co.nz/about" className="text-cream/78 hover:text-cream transition-colors">About</a></li>
              <li><a href="https://www.campshare.co.nz/faq" className="text-cream/78 hover:text-cream transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="font-sans text-[0.75rem] tracking-[0.18em] uppercase text-ochre font-semibold mb-4">Legal</h5>
            <ul className="list-none flex flex-col gap-[0.65rem] m-0 p-0">
              <li><Link href="/terms" className="text-cream/78 hover:text-cream transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="text-cream/78 hover:text-cream transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center pt-8 flex-wrap gap-4 text-[0.85rem] text-cream/55">
          <span>© {year} CampShare Aotearoa Ltd. Made in NZ.</span>
          <span>Ngā mihi nui — travel safe.</span>
        </div>
      </div>
    </footer>
  );
}
