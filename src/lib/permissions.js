/**
 * Role definitions and permission checks.
 *
 * Two admin tiers:
 *   subadmin   — day-to-day moderation: approve/reject observations and
 *                reviews, manage products and orders.
 *   superadmin — everything a subadmin can do, plus anything destructive or
 *                trust-related: banning users, changing roles, deleting
 *                observations and reviews, and the submission privileges
 *                (gallery upload, manual location entry).
 *
 * "admin" is the legacy role that predates this split. It is treated as
 * superadmin so existing accounts keep working — without that, every current
 * admin would lose access the moment this ships. Migrate those accounts to
 * "superadmin" and the legacy branch can be dropped.
 *
 * Import these helpers instead of comparing role strings by hand: a stray
 * `role === "admin"` silently excludes subadmins and superadmins alike.
 */

export const ROLES = {
  USER: "user",
  WRITER: "writer",
  SUBADMIN: "subadmin",
  SUPERADMIN: "superadmin",
  LEGACY_ADMIN: "admin",
};

// Every value the User.role enum accepts, for validating role changes.
export const ASSIGNABLE_ROLES = [
  ROLES.USER,
  ROLES.WRITER,
  ROLES.SUBADMIN,
  ROLES.SUPERADMIN,
];

const roleOf = (user) => user?.role;

/** Full privileges: destructive actions, user management, submission overrides. */
export function isSuperAdmin(user) {
  const role = roleOf(user);
  return role === ROLES.SUPERADMIN || role === ROLES.LEGACY_ADMIN;
}

/** Moderation tier only. Does not include superadmins — use hasAdminAccess for "either tier". */
export function isSubAdmin(user) {
  return roleOf(user) === ROLES.SUBADMIN;
}

/** Either admin tier. The check for reaching the admin panel and moderating content. */
export function hasAdminAccess(user) {
  return isSuperAdmin(user) || isSubAdmin(user);
}

/** Writers and above, for article authoring. */
export function isWriterOrAdmin(user) {
  return roleOf(user) === ROLES.WRITER || hasAdminAccess(user);
}

/** Human-readable label for a role, for badges and dropdowns. */
export function roleLabel(role) {
  switch (role) {
    case ROLES.SUPERADMIN:
      return "Super Admin";
    case ROLES.SUBADMIN:
      return "Sub Admin";
    case ROLES.LEGACY_ADMIN:
      return "Admin (legacy)";
    case ROLES.WRITER:
      return "Writer";
    default:
      return "User";
  }
}
