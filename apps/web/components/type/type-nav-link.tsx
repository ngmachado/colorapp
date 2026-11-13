'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STYLE_IDS } from '@/lib/type-state';

/**
 * The Type section link as shown on the Laboratory: it opens the Type laboratory with the columns on the bench
 * as the palette and the intended text-on-background pairs on the text styles. The first pair sets the body;
 * further pairs set display, heading and caption in that order; a style without a pair keeps the body's.
 */
export function TypeNavLink({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Link
      href="/type"
      className={className}
      data-testid="type-link"
      onClick={(e) => {
        const hexes = [...document.querySelectorAll('[data-testid="column"]')]
          .map((el) => el.getAttribute('data-hex') ?? '')
          .filter((h) => /^#[0-9a-f]{6}$/i.test(h));
        if (!hexes.length) return;
        e.preventDefault();
        const pairs = (new URLSearchParams(window.location.search).get('pairs') ?? '')
          .split(',')
          .map((p) => /^(\d+)-(\d+)$/.exec(p))
          .filter((m): m is RegExpExecArray => !!m)
          .map((m) => [Number(m[1]), Number(m[2])] as const)
          .filter(([fg, bg]) => fg < hexes.length && bg < hexes.length);
        const q = [`hex=${hexes.map((h) => h.slice(1).toLowerCase()).join(',')}`];
        if (pairs.length) {
          const body = pairs[0]!;
          const rest = pairs.slice(1);
          const order: Record<(typeof STYLE_IDS)[number], readonly [number, number]> = {
            body,
            display: rest[0] ?? body,
            heading: rest[1] ?? body,
            caption: rest[2] ?? body,
          };
          q.push(`styles=${STYLE_IDS.map((id) => order[id].join('-')).join(',')}`);
        }
        const url = `/type?${q.join('&')}`;
        // A modified click keeps its meaning: the same address in a new tab or window.
        if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(url, '_blank');
        else router.push(url);
      }}
    >
      Type
    </Link>
  );
}
