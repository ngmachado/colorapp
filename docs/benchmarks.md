# Benchmarks

Recorded 2026-10-14 on Apple M1 Pro (8 cores, darwin 25.6.0, arm64), Node v26.10.0. Each figure is its own measurement; none is a combined "palettes per second".

## Starter experiment (10 × 5 × 5 × 5 × 4 cells, two variants each)

| Stage                                           | Time    |
| ----------------------------------------------- | ------- |
| Generation and feature computation, 10000 draws | 946 ms  |
| Cross-cell near-duplicate pass                  | 89 ms   |
| Store 8155 candidates in SQLite                 | 355 ms  |
| Bundle export incl. 1600 px PNG board           | 7454 ms |

Counts: drawn 10000, rejected in cell 1832, cross-cell duplicates 13, kept 8155. Dedupe threshold OKLab 0.02, content version 351b2a2cc4b8707c.

## Single-process generator

10,000 free-form candidates with features and in-run dedupe: about 1.8 s standalone (Node 26), 2.4 s under vitest.

## Browser (Chromium, Playwright, dev server)

- 10,000-candidate run including persistence in batches of 500: about 15 s end to end.
- Gallery of 10,000 cells: zero long tasks (over 50 ms) while scrolling through 30,000 px.
- Database: 10,000 candidates inserted in 349 ms including a replay after reopening the file.

Re-run: `pnpm --filter @sca/web exec tsx scripts/starter.ts` writes `apps/web/data/starter/benchmarks.json`.
