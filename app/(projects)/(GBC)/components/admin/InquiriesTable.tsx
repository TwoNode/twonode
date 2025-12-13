"use client";

import { useState } from "react";
import {
  updateGBCInquiryStatus,
  deleteGBCInquiry,
  replyToGBCInquiry,
} from "../../actions/contact-actions";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Trash2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "../../utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface InquiriesTableProps {
  inquiries: any[];
}

export function InquiriesTable({ inquiries }: InquiriesTableProps) {
  const [viewInquiry, setViewInquiry] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyInquiry, setReplyInquiry] = useState<any>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleStatusChange(id: string, status: string) {
    try {
      const result = await updateGBCInquiryStatus(id, status);
      if (result.success) {
        toast.success("Status updated successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  }

  async function handleSendReply() {
    if (!replySubject.trim() || !replyMessage.trim()) {
      toast.error("Please provide both subject and message");
      return;
    }

    setIsSending(true);
    try {
      const result = await replyToGBCInquiry(
        replyInquiry.id,
        replySubject,
        replyMessage
      );
      if (result.success) {
        toast.success("Reply sent successfully");
        setReplyInquiry(null);
        setReplySubject("");
        setReplyMessage("");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to send reply");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const result = await deleteGBCInquiry(id);
      if (result.success) {
        toast.success("Inquiry deleted successfully");
        setDeleteId(null);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete inquiry");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-gray-500">No inquiries found</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="text-sm text-gray-600">
                    {formatDateTime(inquiry.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{inquiry.name}</TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {inquiry.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">
                    {inquiry.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {inquiry.type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {inquiry.subject}
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={inquiry.status}
                      onValueChange={(value) =>
                        handleStatusChange(inquiry.id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewInquiry(inquiry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(inquiry.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {inquiries.length} inquir{inquiries.length !== 1 ? "ies" : "y"}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewInquiry} onOpenChange={() => setViewInquiry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              {viewInquiry && formatDateTime(viewInquiry.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {viewInquiry && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Name
                  </label>
                  <p className="mt-1">{viewInquiry.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="mt-1">{viewInquiry.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <p className="mt-1">{viewInquiry.phone || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Type
                  </label>
                  <p className="mt-1">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {viewInquiry.type}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Subject
                </label>
                <p className="mt-1 font-medium">{viewInquiry.subject}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Message
                </label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {viewInquiry.message}
                </p>
              </div>

              {viewInquiry.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Notes
                  </label>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg">
                    {viewInquiry.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="default"
                  onClick={() => {
                    setReplyInquiry(viewInquiry);
                    setReplySubject(`Re: ${viewInquiry.subject}`);
                    setViewInquiry(null);
                  }}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(`mailto:${viewInquiry.email}`, "_blank")
                  }
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Open Email Client
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog
        open={!!replyInquiry}
        onOpenChange={(open) => {
          if (!open) {
            setReplyInquiry(null);
            setReplySubject("");
            setReplyMessage("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Inquiry</DialogTitle>
            <DialogDescription>
              {replyInquiry &&
                `Replying to ${replyInquiry.name} (${replyInquiry.email})`}
            </DialogDescription>
          </DialogHeader>
          {replyInquiry && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Original Message:
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {replyInquiry.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-subject">Subject *</Label>
                <Input
                  id="reply-subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Enter email subject"
                  disabled={isSending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-message">Message *</Label>
                <Textarea
                  id="reply-message"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply message here..."
                  rows={8}
                  disabled={isSending}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyInquiry(null);
                    setReplySubject("");
                    setReplyMessage("");
                  }}
                  disabled={isSending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={isSending}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              inquiry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
