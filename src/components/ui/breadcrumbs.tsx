import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Crumb } from "@/lib/catalog/breadcrumbs";

/**
 * The visible trail (MDS §6.3): a `nav` landmark holding an ordered list, every
 * ancestor a link and the current page a plain `aria-current="page"` item.
 * Shown at EVERY width — it wraps rather than hides, and each item may shrink
 * (and truncate) so one long category name cannot push the page sideways. The
 * separator is a chevron that mirrors in RTL, and is decorative, so a screen
 * reader hears an ordered list, not a run of slashes.
 */
export async function Breadcrumbs({ trail, className = "" }: { trail: Crumb[]; className?: string }) {
  const t = await getTranslations("common");
  if (trail.length < 2) return null;
  return (
    <nav aria-label={t("breadcrumb")} className={`text-[0.875rem] text-ink-muted ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {trail.map((crumb, index) => {
          const current = index === trail.length - 1;
          return (
            <li key={`${index}-${crumb.label}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? <ChevronRight className="size-3.5 flex-none rtl:-scale-x-100" aria-hidden="true" /> : null}
              {crumb.href && !current ? (
                <Link href={crumb.href} className="-my-1.5 inline-flex min-h-11 max-w-[14rem] items-center truncate hover:text-ink hover:underline underline-offset-4">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={current ? "page" : undefined} className="max-w-[16rem] truncate text-ink-secondary sm:max-w-[28rem]">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
