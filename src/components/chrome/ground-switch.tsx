"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useStore } from "@/components/providers/store-context";
import { GROUND_STORAGE_KEY } from "@/lib/theme/ground-script";

type Ground = "system" | "light" | "dark";

/**
 * The visitor's ground choice — offered only when the merchant enabled the dark
 * ground AND allows visitors to choose (D-S5, MDS §17 Theme). "System" removes
 * the explicit choice so the CSS media query decides again. The flip is not
 * animated (MDS §23).
 */
export function GroundSwitch() {
  const t = useTranslations("common");
  const { allowVisitorGround } = useStore();
  const [ground, setGround] = useState<Ground>("system");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-ground");
    setGround(current === "light" || current === "dark" ? current : "system");
  }, []);

  if (!allowVisitorGround) return null;

  function choose(value: Ground) {
    setGround(value);
    if (value === "system") document.documentElement.removeAttribute("data-ground");
    else document.documentElement.setAttribute("data-ground", value);
    try {
      if (value === "system") window.localStorage.removeItem(GROUND_STORAGE_KEY);
      else window.localStorage.setItem(GROUND_STORAGE_KEY, value);
    } catch {
      /* storage blocked — applies to this page only */
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="t-label mb-2 text-ink-muted">{t("appearance")}</legend>
      <div className="grid grid-cols-3 gap-2">
        {(["system", "light", "dark"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={ground === value} onClick={() => choose(value)} className={`min-h-11 rounded-[var(--sf-radius-control)] border text-[0.875rem] ${ground === value ? "border-ink font-semibold" : "border-line-strong"}`}>
            {t(`ground_${value}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
