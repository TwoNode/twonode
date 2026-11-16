"use client";

/**
 * "I agree to the Terms and Privacy Policy" on a registration form. The links open in a new tab so
 * the half-filled form is not lost (listed in noNewTabFiles.test.ts: they are pages, not files).
 */
export function ConsentCheckbox({
  checked,
  onChange,
  termsHref,
  privacyHref,
  accent,
  invalid,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  termsHref: string;
  privacyHref: string;
  accent: string;
  invalid?: boolean;
}) {
  const link = "font-semibold underline underline-offset-2 hover:opacity-80";
  return (
    <label
      className={`flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 ${
        invalid ? "text-red-600 dark:text-red-400" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid || undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
        style={{ accentColor: accent }}
      />
      <span>
        I have read and agree to the{" "}
        <a
          href={termsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
          style={{ color: accent }}
        >
          Terms of Use
        </a>{" "}
        and the{" "}
        <a
          href={privacyHref}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
          style={{ color: accent }}
        >
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}
