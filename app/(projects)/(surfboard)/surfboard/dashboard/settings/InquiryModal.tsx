import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function InquiryModal({ open, onOpenChange, onSend, isSending }: any) {
  const [details, setDetails] = useState("");

  const handleSend = () => {
    onSend(details);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#333] text-white">
        <DialogHeader>
          <DialogTitle>Account Update Inquiry</DialogTitle>
          <DialogDescription className="text-gray-400 dark:text-gray-500">
            Send an email to the admin team detailing what you want to change in your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="I want to change my..."
            className="w-full h-32 bg-[#2A2A2A] border-[#444]"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !details}>
            {isSending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
