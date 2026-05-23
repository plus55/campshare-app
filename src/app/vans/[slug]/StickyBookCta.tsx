"use client";

import { Button } from "@/components/ui/button";

interface Props {
  nightlyRateCents: number;
}

export default function StickyBookCta({ nightlyRateCents }: Props) {
  const price = Math.round(nightlyRateCents / 100);

  function scrollToForm() {
    document.getElementById("book-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pdp-sticky-cta">
      <p className="m-0 text-base font-semibold text-foreground">
        From ${price}<span className="text-[13px] font-normal text-muted-foreground">/night</span>
      </p>
      <Button type="button" size="lg" onClick={scrollToForm}>
        Select dates
      </Button>
    </div>
  );
}
