import type { Category, Localized, ResolvedLink, StoreProfile } from "@/lib/api/types";
import { linkHref } from "@/lib/links";

/**
 * What the footer links to — composed only from what the backend says exists, so every link resolves:
 *
 *  - Explore: the store's top-level categories (published — the storefront API returns nothing else), then any
 *    category or collection the owner adds to the footer navigation in Staff.
 *  - Customer care / Information: published pages only — the legal pages the backend always reports when published
 *    (`legalLinks`), plus any page the owner links in the footer navigation. A page is placed by its slug; a page
 *    whose slug is not one of these lands at the end of Information, never dropped — except an unlisted one
 *    (`UNLISTED_PAGES`), which customer navigation never shows.
 *
 * Nothing here invents a route: an unpublished or missing page is simply absent (the backend resolves an
 * unpublished reference to nothing).
 */
export interface FooterLink {
  href: string;
  label: Localized;
}

/** Customer-care pages, in reading order. `faq` is not a legal page — it appears once the owner creates and links it. */
export const CARE_PAGES = ["contact", "faq", "shipping", "returns"] as const;
/** Information pages, in reading order. `about`, `cancellation` and `payment` appear once the owner creates and links them. */
export const INFO_PAGES = ["about", "privacy", "terms", "cancellation", "payment", "accessibility"] as const;
/**
 * Pages kept out of customer navigation even when published — owner decision (2026-10-30): no separate cookie page
 * for now. The draft itself stays in Staff, unpublished; this only keeps a link to it out of the footer.
 */
export const UNLISTED_PAGES = ["cookies"] as const;

export function exploreLinks(categories: readonly Category[], footerNavigation: readonly ResolvedLink[]): FooterLink[] {
  const fromCatalog = categories
    .filter((category) => !category.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ href: linkHref({ kind: "category", slug: category.slug }), label: category.name }));
  const fromNavigation = footerNavigation.filter((link) => link.kind !== "page").map((link) => ({ href: linkHref(link), label: link.label }));
  return dedupe([...fromCatalog, ...fromNavigation]);
}

export function pageGroups(legalLinks: readonly ResolvedLink[], footerNavigation: readonly ResolvedLink[]): { care: FooterLink[]; info: FooterLink[] } {
  const pages = new Map<string, ResolvedLink>();
  const unlisted = new Set<string>(UNLISTED_PAGES);
  for (const link of [...legalLinks, ...footerNavigation]) if (link.kind === "page" && !unlisted.has(link.slug) && !pages.has(link.slug)) pages.set(link.slug, link);
  const pick = (slugs: readonly string[]) => slugs.flatMap((slug) => (pages.has(slug) ? [toLink(pages.get(slug)!)] : []));
  const known = new Set<string>([...CARE_PAGES, ...INFO_PAGES]);
  const others = [...pages.values()].filter((link) => !known.has(link.slug)).map(toLink);
  return { care: pick(CARE_PAGES), info: [...pick(INFO_PAGES), ...others] };
}

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "whatsapp" | "youtube" | "x" | "snapchat" | "other";

export interface SocialChannel {
  platform: SocialPlatform;
  /** The platform's name as the owner typed it — the accessible name for a platform this list does not know. */
  name: string;
  url: string;
}

const PLATFORM_ALIASES: Record<string, SocialPlatform> = {
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  whatsapp: "whatsapp",
  youtube: "youtube",
  x: "x",
  twitter: "x",
  snapchat: "snapchat",
};

/**
 * The store's social profiles (`profile.socialLinks`, free-text platform names) and its WhatsApp chat
 * (`profile.contact.whatsApp`, a phone number → a wa.me direct-chat link). Only http(s) URLs pass: the platform
 * field is free text and a `javascript:` URL must never become a link. A store with no values shows nothing.
 */
export function socialChannels(profile: Pick<StoreProfile, "socialLinks" | "contact">): SocialChannel[] {
  const channels: SocialChannel[] = [];
  for (const social of profile.socialLinks ?? []) {
    if (!isWebUrl(social.url)) continue;
    const key = social.platform.trim().toLowerCase().replace(/[\s_-]+/g, "");
    channels.push({ platform: PLATFORM_ALIASES[key] ?? "other", name: social.platform.trim(), url: social.url });
  }
  const chat = whatsAppChatUrl(profile.contact?.whatsApp);
  if (chat && !channels.some((channel) => channel.platform === "whatsapp")) channels.push({ platform: "whatsapp", name: "WhatsApp", url: chat });
  return dedupeBy(channels, (channel) => channel.url);
}

/** A direct chat with the business number: wa.me takes the international number as digits only. */
export function whatsAppChatUrl(phone: string | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const toLink = (link: ResolvedLink): FooterLink => ({ href: linkHref(link), label: link.label });
const dedupe = (links: FooterLink[]) => dedupeBy(links, (link) => link.href);

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(key(item)) ? false : (seen.add(key(item)), true)));
}
