/**
 * Client-side role utility.
 * Mirrors the logic in lib/roles.ts but runs in the browser.
 */

const MANAGER_JOB_TITLES = [
  'ceo', 'cto', 'coo', 'cfo',
  'hr manager', 'hr lead', 'head of hr',
  'people manager', 'engineering manager', 'product manager',
  'team lead', 'team leader', 'director', 'vp', 'vice president',
];

export function isManagerJobTitle(jobTitle: string | undefined | null): boolean {
  if (!jobTitle) return false;
  const lower = jobTitle.toLowerCase().trim();
  return MANAGER_JOB_TITLES.some((t) => lower.includes(t));
}

/**
 * Returns true if the user has manager-level (or higher) access.
 * Accepts the `user` object from AuthContext.
 */
export function isManagerOrAbove(user: { role?: string; job_title?: string } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'manager') return true;
  return isManagerJobTitle(user.job_title);
}
