"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { MOTION } from "@/lib/motion/tokens";
import { SocialIcon } from "./social-icon";

/**
 * The floating WhatsApp contact, mounted once in the locale layout so every storefront page shares it. It opens a
 * direct chat with the store's configured WhatsApp number (`profile.contact.whatsApp`, passed in as its wa.me URL) —
 * without a number there is no button.
 *
 * It rises above everything docked at the bottom: the phone tab bar (`--sf-tabbar-space`, which includes the iPhone
 * safe-area inset) plus any page bar stacked on it — the purchase bar, the cart's summary — (`--sf-dock`,
 * lib/hooks/use-floating-dock.ts). It keeps its original size, ring and shadow. On a phone it sits directly above the
 * Home tab with a small gap (`bottom-4`, 16px above the topmost bar): its centre is Home's centre, derived from the tab
 * bar's own geometry (mobile-tab-bar.tsx — five equal cells across at most 36rem, centred, inset 0.5rem):
 *   start = max(0, (100vw − 36rem) / 2) + 0.5rem + (min(100vw, 36rem) − 1rem) / 10 − half this button (1.625rem).
 * Logical `start`, so it is over Home on the right in Arabic and on the left in English. From lg (no tab bar) it keeps
 * its original place at the foot of the viewport.
 */
export function FloatingWhatsApp({ url }: { url: string }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const reduce = useReducedMotion();
  if (pathname.startsWith("/checkout")) return null;

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsAppChat")}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION.standard, ease: MOTION.easeStandard, delay: MOTION.standard }}
      className="fixed bottom-4 start-[calc(max(0px,(100vw-36rem)/2)+0.5rem+(min(100vw,36rem)-1rem)/10-1.625rem)] z-30 grid size-13 translate-y-[calc((var(--sf-tabbar-space,0px)+var(--sf-dock,0px))*-1)] place-items-center rounded-full bg-action text-on-action shadow-card ring-4 ring-blush-soft transition-[translate,scale,background-color] duration-[var(--sf-duration-standard)] ease-standard hover:scale-105 hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:scale-100 print:hidden lg:bottom-[max(1rem,env(safe-area-inset-bottom))] lg:start-6 lg:size-14"
    >
      <SocialIcon platform="whatsapp" className="size-6 lg:size-7" />
    </motion.a>
  );
}
