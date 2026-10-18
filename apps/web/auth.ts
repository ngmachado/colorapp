import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { schema } from '@sca/db';
import NextAuth from 'next-auth';
import Nodemailer from 'next-auth/providers/nodemailer';
import Resend from 'next-auth/providers/resend';
import { dbUnchecked } from '@/lib/db';

/**
 * Magic-link sign-in. Sessions live in the database so they are revoked when a user is deleted.
 * Mail goes through Resend when AUTH_RESEND_KEY is set (production, free tier), otherwise over SMTP
 * (development: the Mailpit container). Required everywhere: AUTH_SECRET, DATABASE_URL.
 */
const from = process.env.EMAIL_FROM ?? 'Super Colour <noreply@localhost>';
export const EMAIL_PROVIDER = process.env.AUTH_RESEND_KEY ? 'resend' : 'nodemailer';

// A function, so the database is first touched by a request, never by the build.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(dbUnchecked(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    process.env.AUTH_RESEND_KEY
      ? Resend({ apiKey: process.env.AUTH_RESEND_KEY, from })
      : Nodemailer({ server: process.env.EMAIL_SERVER ?? 'smtp://localhost:1025', from }),
  ],
  session: { strategy: 'database' },
  // Our own screens instead of the Auth.js defaults, so the toolbar and wording stay the app's.
  pages: { signIn: '/signin', verifyRequest: '/signin/sent' },
  trustHost: true,
}));
