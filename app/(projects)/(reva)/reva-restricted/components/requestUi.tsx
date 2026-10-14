import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { revaStatusBadgeStyle } from "@/reva/colors";

/** Presentation helpers shared by the REVA admin request list and detail pages. */

export type RequestTone = "success" | "warning" | "info" | "error";

export const toneForStatus = (status?: string | null): RequestTone => {
  switch (status) {
    case "Available":
    case "Completed":
      return "success";
    case "Processing":
      return "warning";
    default:
      return "info";
  }
};

export const toneForPayment = (status?: string | null): RequestTone => {
  switch (status) {
    case "Paid":
      return "success";
    case "Unpaid":
      return "error";
    default:
      return "info";
  }
};

/** A small status chip: a coloured dot and a label, tinted like the rest of REVA's badges. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: RequestTone;
  children: ReactNode;
  className?: string;
}) {
  const style = revaStatusBadgeStyle(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap",
        className
      )}
      style={style}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: style.color }}
      />
      {children}
    </span>
  );
}

/** A label above a value, for the fact grids. */
export function Fact({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground wrap-break-word">
        {children}
      </dd>
    </div>
  );
}

/** A readable name for a stored document: the file name without folders, `_` or `.pdf`. */
export function documentLabel(url: string, index: number): string {
  const last = url.split("?")[0].split("/").pop() ?? "";
  const name = last
    .replace(/^\d{10,}__[a-z0-9]+__/i, "")
    .replace(/_/g, " ")
    .replace(/\.pdf$/i, "")
    .trim();
  return name || `Document ${index + 1}`;
}

/** One colour per kind of request, used on the card chip and the avatar ring. */
export const KIND_COLOR = { oneTime: "#7c3aed", regular: "#2563eb" } as const;

/** A round avatar with the requester's initials, tinted with the kind's colour. */
export function Avatar({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        className
      )}
      style={{ backgroundColor: `${color}1F`, color }}
    >
      {initials}
    </span>
  );
}
