import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    section: "For travellers",
    items: [
      {
        q: "How does booking work?",
        a: "Find a van, send the host a booking request with your dates and a short message. Your card is authorised on request and only charged when the host accepts. You'll get an email confirmation with pickup details.",
      },
      {
        q: "What happens if I need to cancel?",
        a: "Cancel more than 7 days before check-in for a full refund. Between 2–7 days you get 50% back. Inside 48 hours bookings are non-refundable. The host's policy is shown on every listing.",
      },
      {
        q: "Is there a security deposit?",
        a: "Yes — a $500 hold is placed on your card when your trip starts and released 24 hours after you return the van, assuming no damage is reported.",
      },
    ],
  },
  {
    section: "For van owners",
    items: [
      {
        q: "How much does it cost to list?",
        a: "Nothing upfront. CampShare takes a 12% service fee from guest bookings and a 5% host fee, plus GST on the fees. You set your own nightly rate.",
      },
      {
        q: "How do payouts work?",
        a: "We use Stripe Connect to pay you directly. Payouts are released 24 hours after the trip completes — usually in your bank account 1–2 business days later.",
      },
      {
        q: "What about insurance and damage?",
        a: "Hosts currently arrange their own insurance through a NZ provider. The $500 deposit covers minor damage; we're building broader cover as we grow.",
      },
    ],
  },
];

export default function HomepageFaq() {
  return (
    <section className="bg-cream py-[clamp(3rem,6vw,5rem)]">
      <div className="wrap max-w-[880px]">
        <h2 className="mb-[clamp(2rem,4vw,3rem)] text-center text-[clamp(1.8rem,3vw,2.4rem)]">
          Common questions
        </h2>
        {FAQS.map((group) => (
          <div key={group.section} className="mb-10 last:mb-0">
            <h3 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ochre">
              {group.section}
            </h3>
            <Accordion multiple={false} className="flex flex-col gap-2">
              {group.items.map((it) => (
                <AccordionItem
                  key={it.q}
                  value={it.q}
                  className="rounded-[var(--radius)] border border-line bg-sand px-5"
                >
                  <AccordionTrigger className="py-4 font-serif text-[1.05rem] font-medium text-forest-deep hover:no-underline">
                    {it.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-charcoal-soft">
                    {it.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  );
}
