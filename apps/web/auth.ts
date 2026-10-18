import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { schema } from '@sca/db';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Nodemailer from 'next-auth/providers/nodemailer';
import Resend from 'next-auth/providers/resend';
import { dbUnchecked } from '@/lib/db';

/**
 * Sign-in methods, each present only when configured:
 * Google when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set (the public site's method: no mail, no domain);
 * an email link through Resend when AUTH_RESEND_KEY is set, or over SMTP in development (Mailpit).
 * Sessions live in the database so they are revoked when a user is deleted.
 * Required everywhere: AUTH_SECRET, DATABASE_URL.
 */
const from = process.env.EMAIL_FROM ?? 'Super Colour <noreply@localhost>';
export const GOOGLE = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const EMAIL_PROVIDER = process.env.AUTH_RESEND_KEY
  ? 'resend'
  : process.env.EMAIL_SERVER || !process.env.VERCEL
    ? 'nodemailer'
    : null;

function providers(): NextAuthConfig['providers'] {
  const list: NextAuthConfig['providers'] = [];
  if (GOOGLE)
    list.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        // Google verifies its addresses, so a Google sign-in may attach to an account first made by email link.
        allowDangerousEmailAccountLinking: true,
      }),
    );
  if (EMAIL_PROVIDER === 'resend') list.push(Resend({ apiKey: process.env.AUTH_RESEND_KEY, from }));
  else if (EMAIL_PROVIDER === 'nodemailer')
    list.push(Nodemailer({ server: process.env.EMAIL_SERVER ?? 'smtp://localhost:1025', from }));
  return list;
}

// A function, so the database is first touched by a request, never by the build.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(dbUnchecked(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: providers(),
  session: { strategy: 'database' },
  // Our own screens instead of the Auth.js defaults, so the toolbar and wording stay the app's.
  pages: { signIn: '/signin', verifyRequest: '/signin/sent' },
  trustHost: true,
}));
