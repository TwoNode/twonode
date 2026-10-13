import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A section heading for the REVA admin pages: the title with a hairline under
 * it. A trailing `<small>` (a count, for example) is shown quieter.
 */
export const AdminMiniHeader = ({
  title = "Admin Report Upload",
  className,
}: {
  title?: string | ReactNode | null;
  className?: string;
}) => {
  return (
    <header className={cn("border-b border-border pb-3", className)}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground [&_small]:ml-1 [&_small]:text-sm [&_small]:font-normal [&_small]:text-muted-foreground">
        {title}
      </h2>
    </header>
  );
};
