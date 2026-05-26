"use client";

import { Button } from "@/components/ui/button";
import { fmtNzd } from "@/lib/money";

interface Props {
  nightlyRateCents: number;
}

export default function StickyBookCta({ nightlyRateCents }: Props) {
  function scrollToForm() {
    document.getElementById("book-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pdp-sticky-cta">
      <p className="m-0 text-base font-semibold text-foreground">
        From {fmtNzd(nightlyRateCents)}<span className="text-[13px] font-normal text-muted-foreground">/night</span>
      </p>
      <Button type="button" size="lg" onClick={scrollToForm}>
        Select dates
      </Button>
    </div>
  );
}
