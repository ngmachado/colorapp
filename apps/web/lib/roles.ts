import type { Role } from '@sca/generator';

/** Column roles in order; a palette of n columns uses the first n. Shared by server pages and the Laboratory. */
export const ROLES: Role[] = ['dominant', 'secondary', 'accent', 'support', 'highlight'];
