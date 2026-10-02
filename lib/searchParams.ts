/** A Next.js `searchParams` value can be a string, an array (repeated key) or missing — take the first. */
export function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
