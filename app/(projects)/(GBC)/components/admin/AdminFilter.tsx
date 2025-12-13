"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface AdminFilterProps {
  onFilterChange: (filters: { roles: string[]; statuses: boolean[] }) => void;
}

export function AdminFilter({ onFilterChange }: AdminFilterProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    "ADMIN",
    "SUPERADMIN",
  ]);
  const [selectedStatuses, setSelectedStatuses] = useState<boolean[]>([
    true,
    false,
  ]); // Both active and inactive by default

  const handleRoleToggle = (role: string) => {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];

    setSelectedRoles(newRoles);
    onFilterChange({ roles: newRoles, statuses: selectedStatuses });
  };

  const handleStatusToggle = (status: boolean) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    setSelectedStatuses(newStatuses);
    onFilterChange({ roles: selectedRoles, statuses: newStatuses });
  };

  // Calculate active filters (when not showing all options)
  const activeFilterCount =
    (selectedRoles.length < 2 ? 1 : 0) + (selectedStatuses.length < 2 ? 1 : 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2 whitespace-nowrap text-sm sm:text-base"
        >
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={selectedRoles.includes("ADMIN")}
          onCheckedChange={() => handleRoleToggle("ADMIN")}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            Regular Admins
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={selectedRoles.includes("SUPERADMIN")}
          onCheckedChange={() => handleRoleToggle("SUPERADMIN")}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-600" />
            Super Admins
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={selectedStatuses.includes(true)}
          onCheckedChange={() => handleStatusToggle(true)}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-600" />
            Active
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={selectedStatuses.includes(false)}
          onCheckedChange={() => handleStatusToggle(false)}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-600" />
            Inactive
          </div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
