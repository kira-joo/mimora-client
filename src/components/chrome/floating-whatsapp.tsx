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
 * It sits at the reading-start foot of the viewport (the right in Arabic, the left in English) and rises above any
 * bottom dock — the phone purchase bar, the cart's summary bar — by `--sf-dock` (lib/hooks/use-floating-dock.ts), so it
 * never covers their buttons. Checkout has no button at all: nothing may float over the order form. It enters once
 * (a short fade and lift) and grows slightly on hover; there is no looping motion, and none under reduced motion.
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
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      className="fixed start-4 z-30 grid size-13 translate-y-[calc(var(--sf-dock,0px)*-1)] place-items-center rounded-full bg-action text-on-action shadow-card ring-4 ring-blush-soft transition-[translate,scale,background-color] duration-[var(--sf-duration-standard)] ease-standard hover:scale-105 hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:scale-100 print:hidden lg:start-6 lg:size-14"
    >
      <SocialIcon platform="whatsapp" className="size-6 lg:size-7" />
    </motion.a>
  );
}
