"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  //   DialogTrigger,
} from "@/components/ui/dialog";
import { CountdownComponent } from "./CountdownComponent";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MyPopup() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    router.push("/gbc");

  };

  return (
    <Dialog defaultOpen={true} open={open}>
      {/* <DialogTrigger asChild>
        <Button variant="outline" className="text-red-600"></Button>
      </DialogTrigger> */}
      <DialogContent className="w-[90%] max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <h2 className="text-sky-950 text-[30px] md:text-[50px] font-extrabold leading-[60px]">
              Geospatial Builders Course 1.0
            </h2>
          </DialogTitle>
          <DialogDescription>
            <div className="self-stretch">
              <p className="text-[#001f3f] lg:text-lg text-sm font-normal font-['Bricolage Grotesque'] leading-[30px]">
                An ultra-specific training that will address the current trends,
                development and policies around Surveying and Geospatial space
                that call for a need to be seen as a versatile geospatial
                specialist rather than being confined to the public's view of
                land surveyors, it is imperative to break free from this narrow
                viewpoint. <br />
                <br />
                Historically, this is going to be the first of its kind in the
                survey space in Nigeria.{" "}
              </p>
              <span className="text-[#001f3f] text-lg font-bold font-['Bricolage Grotesque'] leading-[30px]">
                GBC1.0!!!
              </span>
            </div>
            <CountdownComponent />
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <div className="flex flex-col">
              <Link
                href={"/gbc"}
                onClick={handleClose}
                className="w-full sm:w-[228px] h-16 bg-[#001f3f] rounded-[70.74px] shadow justify-center items-center flex"
              >
                <span className="text-white text-nowrap text-2xl font-medium font-['Bricolage Grotesque']">
                  Apply Now
                </span>
              </Link>
            </div>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
