// Web Worker entry. The host posts { type: 'run' | 'cancel' } and receives progress, done or error messages.
// Plain messages only: every payload is structured-clone safe, so there is no proxying across the boundary.
import { runAsync, type Progress } from './pipeline';
import type { GeneratorParamsInput, Manifest } from './types';

export type WorkerRequest =
  { type: 'run'; input: GeneratorParamsInput; contentVersion: string | null } | { type: 'cancel' };

export type WorkerMessage =
  | ({ type: 'progress' } & Progress)
  | { type: 'done'; manifest: Manifest }
  | { type: 'error'; message: string };

let cancelled = false;

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }
  cancelled = false;
  const post = (m: WorkerMessage) => self.postMessage(m);
  try {
    const result = await runAsync(msg.input, {
      contentVersion: msg.contentVersion,
      onProgress: (p) => post({ type: 'progress', ...p }),
      shouldCancel: () => cancelled,
    });
    post({ type: 'done', manifest: result.manifest });
  } catch (e) {
    post({ type: 'error', message: (e as Error).message });
  }
};
