'use client';

import dynamic from 'next/dynamic';

/** Three.js is loaded only on this route, and only in the browser: WebGL has no server side. */
export const SpaceMapLoader = dynamic(() => import('./space-map').then((m) => m.SpaceMap), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[560px] flex-1 items-center justify-center text-sm text-[var(--muted)]">
      Loading the map…
    </div>
  ),
});
