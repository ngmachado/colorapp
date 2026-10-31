'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';

export type CreateKeyState = { created?: { name: string; secret: string }; error?: string } | null;

/** Makes a key for the signed-in user and returns the secret for its one showing. */
export async function createKey(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const user = await currentUser();
  if (!user) return { error: 'Sign in first.' };
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, 40);
  if (!name) return { error: 'Give the key a name, so you know what to revoke later.' };
  try {
    const { secret } = await user.data.keys.create(name);
    revalidatePath('/account');
    return { created: { name, secret } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Revokes one of the signed-in user's keys. A wrong id is a no-op. */
export async function revokeKey(formData: FormData) {
  const user = await currentUser();
  if (!user) return;
  await user.data.keys.revoke(String(formData.get('id')));
  revalidatePath('/account');
}
