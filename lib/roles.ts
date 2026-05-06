/**
 * Centralised role resolution for Flair Teams.
 *
 * A user is treated as a "manager" when:
 *  - Their TeamMember.role is 'manager' or 'admin', OR
 *  - Their job title indicates a management position (CEO, CTO, HR Manager, etc.)
 *
 * This utility provides a single source-of-truth so that permission checks
 * across all API routes stay consistent.
 */

/** Job titles that automatically confer manager-level permissions */
export const MANAGER_JOB_TITLES = [
  'ceo',
  'cto',
  'coo',
  'cfo',
  'hr manager',
  'hr lead',
  'head of hr',
  'people manager',
  'engineering manager',
  'product manager',
  'team lead',
  'team leader',
  'director',
  'vp',
  'vice president',
];

/**
 * Returns true if the job title matches a manager-level position.
 */
export function isManagerJobTitle(jobTitle: string | undefined | null): boolean {
  if (!jobTitle) return false;
  const lower = jobTitle.toLowerCase().trim();
  return MANAGER_JOB_TITLES.some((t) => lower.includes(t));
}

/**
 * Given a TeamMember role and job title, returns the effective role
 * that should be used for permission checks.
 *
 * Manager-level job titles are promoted to 'manager' regardless of the
 * stored role value.
 */
export function effectiveRole(
  storedRole: string,
  jobTitle?: string | null
): 'admin' | 'manager' | 'member' {
  if (storedRole === 'admin') return 'admin';
  if (storedRole === 'manager') return 'manager';
  if (isManagerJobTitle(jobTitle)) return 'manager';
  return 'member';
}

/**
 * Returns true if the effective role grants manager-level (or higher) access.
 */
export function isManagerOrAbove(
  storedRole: string,
  jobTitle?: string | null
): boolean {
  const role = effectiveRole(storedRole, jobTitle);
  return role === 'admin' || role === 'manager';
}
