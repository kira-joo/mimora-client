"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { useStore } from "@/components/providers/store-context";
import { GROUND_STORAGE_KEY } from "@/lib/theme/ground-script";

type Ground = "light" | "dark";

/** The ground the page is painted on now: the server's default or the pre-paint script set `data-ground`; absent means light. */
function currentGround(): Ground {
  return document.documentElement.getAttribute("data-ground") === "dark" ? "dark" : "light";
}

const groundListeners = new Set<() => void>();

function subscribeGround(listener: () => void) {
  groundListeners.add(listener);
  return () => {
    groundListeners.delete(listener);
  };
}

/** Applies a choice and remembers it, so it survives a reload and every navigation. The flip is not animated (MDS §23). */
function applyGround(value: Ground) {
  document.documentElement.setAttribute("data-ground", value);
  try {
    window.localStorage.setItem(GROUND_STORAGE_KEY, value);
  } catch {
    /* storage blocked — applies to this page only */
  }
  groundListeners.forEach((listener) => listener());
}

/** The server and the hydration pass render "light"; the real ground (set before paint) is read right after, as an external-store snapshot. */
function useGround() {
  const ground = useSyncExternalStore(subscribeGround, currentGround, (): Ground => "light");
  return [ground, applyGround] as const;
}

/**
 * The visitor's ground choice: Light or Dark, nothing else — Mimora has no "system" mode (tokens.css).
 * Offered only when the merchant enabled the dark ground AND allows visitors to choose (D-S5).
 *
 * `toggle` is the header's single icon button; `segmented` is the labelled pair for the mobile menu.
 */
export function GroundSwitch({ variant = "segmented", className }: { variant?: "toggle" | "segmented"; className?: string }) {
  const t = useTranslations("common");
  const { allowVisitorGround } = useStore();
  const [ground, choose] = useGround();

  if (!allowVisitorGround) return null;

  if (variant === "toggle") {
    const next: Ground = ground === "dark" ? "light" : "dark";
    const Icon = ground === "dark" ? Sun : Moon;
    return (
      <button type="button" onClick={() => choose(next)} className={className} aria-label={t(next === "dark" ? "groundToDark" : "groundToLight")} title={t(next === "dark" ? "groundToDark" : "groundToLight")}>
        <Icon className="size-[22px]" aria-hidden="true" />
      </button>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="t-label mb-2 text-ink-muted">{t("appearance")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["light", "dark"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={ground === value} onClick={() => choose(value)} className={`min-h-11 rounded-[var(--sf-radius-control)] border text-[0.875rem] ${ground === value ? "border-ink font-semibold" : "border-line-strong"}`}>
            {t(`ground_${value}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
