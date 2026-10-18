import { EMAIL_PROVIDER, GOOGLE } from '@/auth';

/**
 * Whether people can sign in on this server. True when a sign-in method is configured, or in
 * development with the fixed local user. When false, the Library lives in the browser and nothing
 * in the interface mentions accounts.
 */
export const ACCOUNTS =
  GOOGLE ||
  EMAIL_PROVIDER !== null ||
  (process.env.AUTH_DISABLED === '1' && process.env.NODE_ENV !== 'production');
