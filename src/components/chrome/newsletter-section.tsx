import { Bow, HandHeart, SolidHeart } from "@/components/home/ornaments";
import { NewsletterForm } from "./newsletter-form";

/**
 * The newsletter, as its own section directly above the footer on every storefront page (it sits in the layout,
 * not in any one page). The form is unchanged (newsletter-form.tsx); from lg the card's other half is a small drawn
 * composition — gingham, a bow and hand-drawn hearts — all decorative.
 */
export function NewsletterSection() {
  return (
    <section className="container-sf mt-(--sf-section)">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-panel bg-surface px-6 py-8 shadow-card sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-10">
        <HandHeart className="absolute end-5 top-5 size-8 rotate-12 text-ornament opacity-60 lg:hidden" />
        <NewsletterForm />
        <div aria-hidden="true" className="relative hidden h-full min-h-40 lg:block">
          <div className="gingham absolute inset-y-2 end-0 w-3/4 rounded-card opacity-80" />
          <Bow className="absolute end-[18%] top-1/2 w-52 -translate-y-1/2 rotate-[-6deg] rtl:-scale-x-100 rtl:rotate-[6deg]" />
          <HandHeart className="absolute end-[6%] top-4 size-8 rotate-12 text-ornament" />
          <SolidHeart className="absolute bottom-6 end-[62%] size-4 -rotate-12 text-ornament" />
          <HandHeart className="absolute bottom-3 end-[8%] size-5 -rotate-6 text-ornament" />
        </div>
      </div>
    </section>
  );
}
