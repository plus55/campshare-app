import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ApplySubmittedPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[560px]">
        <div className="rounded-2xl border border-line bg-cream p-8 text-center">
          <h1 className="mb-3 font-serif text-3xl text-forest-deep">Thanks — we&apos;ve got it.</h1>
          <p className="text-stone">
            Your host application is in. We review applications within 1–2 business days and will email you the moment we&apos;ve made a decision.
          </p>
          <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
