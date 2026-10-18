'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';

/**
 * A GET form that applies itself: ticks, radios and selects navigate at once, text fields after a short pause.
 * The submit button stays for keyboards and for anyone who prefers it. Empty fields leave the address clean.
 */
export function AutoForm({
  children,
  className,
  delay = 350,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  'data-testid'?: string;
  role?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), []);

  const apply = (form: HTMLFormElement) => {
    const qs = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === 'string' && v !== '') qs.append(k, v);
    const next = qs.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  const onChange = (e: FormEvent<HTMLFormElement>) => {
    const t = e.target as HTMLInputElement;
    const form = e.currentTarget;
    window.clearTimeout(timer.current ?? undefined);
    const typed = t.tagName === 'INPUT' && (t.type === 'text' || t.type === 'search');
    if (typed) timer.current = window.setTimeout(() => apply(form), delay);
    else apply(form);
  };
  return (
    <form
      method="get"
      className={className}
      onChange={onChange}
      onInput={onChange}
      onSubmit={(e) => {
        e.preventDefault();
        window.clearTimeout(timer.current ?? undefined);
        apply(e.currentTarget);
      }}
      {...rest}
    >
      {children}
    </form>
  );
}
