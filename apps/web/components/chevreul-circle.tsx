import { SystemCircle } from '@/components/system-circle';

/** Chevreul’s six landmarks, drawn from the records; kept as a name for the places that ask for it. */
export function ChevreulCircle({ compact = false }: { compact?: boolean }) {
  return <SystemCircle system="chevreul-circle" compact={compact} />;
}
