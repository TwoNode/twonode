/** Pure helpers behind the dashboard <Welcome> panel, kept out of the component so they can be tested without a DOM. */

export function timeGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Up to two capital letters from a first and last name; "" when there is no name to draw from. */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim()[0] ?? "";
  const last = lastName?.trim()[0] ?? "";
  return (first + last).toUpperCase();
}

export function roleLabel(role?: string | null): string | null {
  switch (role?.toUpperCase()) {
    case "SUPERADMIN":
      return "Superadmin";
    case "ADMIN":
      return "Admin";
    case "USER":
      return "Member";
    default:
      return null;
  }
}
