import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import { currentUser } from '@/lib/current-user';

export async function POST() {
  const user = await currentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  await user.data.deleteAccount();
  await signOut({ redirect: false });
  redirect('/');
}
