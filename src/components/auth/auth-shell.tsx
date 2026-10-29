import type { ReactNode } from "react";

/** The one frame every auth screen shares: a centred column, the title, the rule. */
export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="container-sf flex justify-center py-10 lg:py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="t-title">{title}</h1>
          {intro ? <p className="text-ink-secondary">{intro}</p> : null}
          <div className="rule" aria-hidden="true" />
        </div>
        {children}
      </div>
    </div>
  );
}
