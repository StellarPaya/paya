import type { ReactNode } from "react";

import { Container } from "@/components/site/Container";

export function Section({
  id,
  title,
  eyebrow,
  description,
  children,
}: {
  id?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="py-16 sm:py-20">
      <Container>
        {(eyebrow || title || description) && (
          <div className="mx-auto max-w-2xl text-center">
            {eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-300">
                {description}
              </p>
            )}
          </div>
        )}
        {children ? <div className="mt-10">{children}</div> : null}
      </Container>
    </section>
  );
}
