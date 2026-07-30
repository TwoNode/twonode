"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface RemarkSelectorProps {
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  buttonText?: string;
}

export function RemarkSelector({
  options,
  onSelect,
  placeholder = "Search previous remarks...",
  buttonText = "Select from previous remarks...",
}: RemarkSelectorProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left h-auto py-2 px-3 text-sm"
        >
          <span className="truncate">{buttonText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No remarks found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((option, idx) => (
                <CommandItem
                  key={idx}
                  value={option}
                  onSelect={(currentValue) => {
                    // cmdk converts value to lowercase, so we use the original option string
                    onSelect(option)
                    setOpen(false)
                  }}
                  className="cursor-pointer whitespace-normal py-2"
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
