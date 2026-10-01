"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { gbcApi } from "@/gbc/apiClient";
import { formatCurrency, formatDate } from "@/gbc/utils";

export interface Ticket {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  phone?: string | null;
  gender: string;
  profession: string;
  ticketType: string;
  price: number;
  paymentStatus: string;
  checkedIn: boolean;
  checkedInAt?: Date | null;
  createdAt: Date;
}

export interface TicketsTableProps {
  tickets: Ticket[];
}

export function AdminTicketsTable({ tickets }: TicketsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    try {
      const result = await gbcApi.tickets.admin.remove(id);

      if (result.success) {
        toast.success("Ticket deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete ticket");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          No Tickets Found
        </h3>
        <p className="text-gray-500">
          Tickets will appear here once purchases are made
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-sm">
                  {ticket.ticketNumber}
                </TableCell>
                <TableCell className="font-medium">{ticket.name}</TableCell>
                <TableCell className="text-gray-600">{ticket.email}</TableCell>
                <TableCell>
                  <span className="text-sm">
                    {ticket.ticketType.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(ticket.price)}
                </TableCell>
                <TableCell>{getStatusBadge(ticket.paymentStatus)}</TableCell>
                <TableCell>
                  {ticket.checkedIn ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">No</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDate(ticket.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {ticket.paymentStatus !== "COMPLETED" && (
                        <DropdownMenuItem
                          onClick={() => setDeleteId(ticket.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Details Dialog */}
      {selectedTicket && (
        <AlertDialog
          open={!!selectedTicket}
          onOpenChange={() => setSelectedTicket(null)}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Ticket Details</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ticket Number</p>
                  <p className="font-mono font-medium">
                    {selectedTicket.ticketNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedTicket.paymentStatus)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{selectedTicket.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedTicket.email}</p>
                </div>
                {selectedTicket.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedTicket.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">
                    {selectedTicket.gender.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profession</p>
                  <p className="font-medium">
                    {selectedTicket.profession.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ticket Type</p>
                  <p className="font-medium">
                    {selectedTicket.ticketType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount Paid</p>
                  <p className="font-medium">
                    {formatCurrency(selectedTicket.price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Purchase Date</p>
                  <p className="font-medium">
                    {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Check-in Status</p>
                  <p className="font-medium">
                    {selectedTicket.checkedIn ? (
                      <span className="text-green-600">
                        Checked in{" "}
                        {selectedTicket.checkedInAt &&
                          `at ${formatDate(selectedTicket.checkedInAt)}`}
                      </span>
                    ) : (
                      <span className="text-gray-500">Not checked in</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              ticket. Only pending tickets can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
