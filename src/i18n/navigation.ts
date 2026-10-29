import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link/redirect/router. `usePathname()` returns the path WITHOUT the locale prefix. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
