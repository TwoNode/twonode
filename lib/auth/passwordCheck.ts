import bcrypt from "bcryptjs";

/**
 * A bcrypt hash (cost 12, the cost every real password here is hashed with) of
 * a random secret that was thrown away. It matches nothing a person could
 * type. It exists so that checking a password for an account that does not
 * exist, or has no password, costs the same one hash as checking it for a
 * real account (I-054).
 */
export const NO_ACCOUNT_HASH =
  "$2b$12$AJ7Ly.l.XlYea1gw4ZPVQOzxTJSZhwsJLkD28Cpaw5r0C03Fldac.";

/**
 * Compares `password` with an account's stored hash, taking the same time
 * whether or not the account has one. Sign-in used to skip the hash when the
 * email was unknown or the account had no password (a Kinde-only account), so
 * a wrong password on a real account took a few hundred milliseconds and an
 * unknown email took a few, and the difference told a caller which emails have
 * accounts. Always one `bcrypt.compare`, against the real hash when there is
 * one and against NO_ACCOUNT_HASH when there is not; the answer is false for
 * the second case whatever the result.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  const hasHash = typeof storedHash === "string" && storedHash.length > 0;
  const matches = await bcrypt.compare(
    password,
    hasHash ? storedHash : NO_ACCOUNT_HASH
  );
  return hasHash && matches;
}
