import { LucideIcon } from "lucide-react";
import { Button, ButtonProps } from "../ui/button";
import { cn } from "@/lib/utils";
import { SheetClose } from "../ui/sheet";

interface SidebarButtonProps extends ButtonProps {
  icon?: LucideIcon;
}

export function SidebarButton({
  icon: Icon,
  className,
  children,
  ...props
}: SidebarButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn("gap-5 justify-start", className)}
      {...props}
    >
      {Icon && <Icon color="white" size={25} />}
      <span>{children}</span>
    </Button>
  );
}

export function SidebarButtonSheet(props: SidebarButtonProps) {
  return (
    <SheetClose asChild>
      <SidebarButton {...props} />
    </SheetClose>
  );
}
