import { currentUser } from '@/lib/current-user';

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const body = JSON.stringify(await user.data.exportAll(), null, 2);
  return new Response(body, {
    headers: {
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="super-colour-export.json"',
    },
  });
}
