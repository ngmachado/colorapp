import { getMeta } from '@sca/db';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      <h1>Super Colour</h1>
      <p>Database schema version {getMeta(db(), 'schema_version')}.</p>
    </main>
  );
}
