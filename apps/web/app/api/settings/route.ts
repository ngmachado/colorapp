import { currentUser } from '@/lib/current-user';
import { isTheme } from '@/lib/theme-value';

/** The account's settings. Today one: `theme`, kept so the choice follows the user to another browser. */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const theme = await user.data.settings.get('theme');
  return Response.json({ theme: isTheme(theme) ? theme : null });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { theme?: unknown } | null;
  if (!body || !isTheme(body.theme))
    return Response.json({ error: 'theme must be "light" or "dark"' }, { status: 400 });
  await user.data.settings.set('theme', body.theme);
  return Response.json({ theme: body.theme });
}
