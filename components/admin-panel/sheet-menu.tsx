import Link from "next/link";
import { MenuIcon, PanelsTopLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Menu } from "@/components/admin-panel/menu";
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8 max-sm:h-6 max-sm:w-6" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="sm:w-72 px-3 h-full flex flex-col bg-[#f0f2f4]"
        side="left"
      >
        <SheetHeader>
          <Button
            className="flex justify-center items-center pb-2 pt-1"
            variant="link"
            asChild
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* <PanelsTopLeft className="w-6 h-6 mr-1" /> */}
              <SheetTitle className="font-bold text-lg">
                <img src={"/logo.svg"} width={"auto"} className="h-10" />
              </SheetTitle>
            </Link>
          </Button>
        </SheetHeader>
        <Menu isOpen />
      </SheetContent>
    </Sheet>
  );
}
