import { Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Paginated, PublicReview } from "@/lib/api/types";
import { formatDate, formatNumber, localized } from "@/lib/format/numerals";

/**
 * Public reviews (MDS §10): approved ones only, with the aggregate. Writing a
 * review lives in the account, against a delivered order — for everyone else
 * the control is absent, not disabled-with-an-explanation.
 */
export async function Reviews({ reviews, rating, timeZone }: { reviews: Paginated<PublicReview> | null; rating: { average: number; count: number }; timeZone: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common");
  if (!reviews || reviews.data.length === 0) return null;
  return (
    <section id="reviews" className="mt-[var(--sf-section)] scroll-mt-24">
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="t-title">{t("reviewsTitle")}</h2>
          <p className="flex items-center gap-1.5 text-ink-secondary">
            <Star className="size-4 fill-current text-caution" aria-hidden="true" />
            <span className="tabular font-semibold text-ink">{formatNumber(locale, rating.average)}</span>
            <span aria-hidden="true">·</span>
            {t("reviews", { n: formatNumber(locale, rating.count) })}
          </p>
        </div>
        <div className="rule" aria-hidden="true" />
      </div>
      <ul className="grid gap-6 md:grid-cols-2">
        {reviews.data.map((review) => (
          <li key={review._id} className="flex flex-col gap-2 border border-line bg-surface p-5">
            <div className="flex items-center gap-0.5" role="img" aria-label={t("ratingOutOf", { rating: formatNumber(locale, review.rating) })}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`size-4 ${i < review.rating ? "fill-current text-caution" : "text-line-strong"}`} aria-hidden="true" />
              ))}
            </div>
            <h3 className="font-semibold">{localized(review.title, locale)}</h3>
            <p className="text-[0.9375rem] leading-relaxed text-ink-secondary">{localized(review.body, locale)}</p>
            <p className="text-[0.8125rem] text-ink-muted">
              {formatDate(locale, review.createdAt, timeZone)}
              {review.verifiedPurchase ? ` · ${t("verifiedPurchase")}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
