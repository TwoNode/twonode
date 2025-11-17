// src/app/admin/inquiries/page.tsx
import { getGBCContactInquiries } from "../../../actions/contact-actions";
import { Card } from "@/components/ui/card";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import { InquiriesTable } from "../../../components/admin/InquiriesTable";

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string };
}) {
  const { status, type } = await searchParams;
  const inquiriesResult = await getGBCContactInquiries({
    status,
    type,
  });

  const inquiries = inquiriesResult.success ? inquiriesResult.data : [];

  // Calculate stats
  const stats = {
    total: inquiries?.length || 0,
    pending: inquiries?.filter((i: any) => i.status === "PENDING").length || 0,
    inProgress:
      inquiries?.filter((i: any) => i.status === "IN_PROGRESS").length || 0,
    resolved:
      inquiries?.filter((i: any) => i.status === "RESOLVED").length || 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Inquiries</h1>
        <p className="text-gray-600">
          Manage and respond to contact form submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Inquiries</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <MessageSquare className="h-10 w-10 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.inProgress}
              </p>
            </div>
            <Clock className="h-10 w-10 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Resolved</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.resolved}
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Filter by Type
            </label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              defaultValue={searchParams.type || "all"}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value === "all") {
                  params.delete("type");
                } else {
                  params.set("type", e.target.value);
                }
                window.location.href = `?${params.toString()}`;
              }}
            >
              <option value="all">All Types</option>
              <option value="GENERAL">General</option>
              <option value="SPONSORSHIP">Sponsorship</option>
              <option value="TECHNICAL">Technical</option>
              <option value="MEDIA">Media</option>
              <option value="SPEAKING">Speaking</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Filter by Status
            </label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              defaultValue={searchParams.status || "all"}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value === "all") {
                  params.delete("status");
                } else {
                  params.set("status", e.target.value);
                }
                window.location.href = `?${params.toString()}`;
              }}
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Inquiries Table */}
      <InquiriesTable inquiries={inquiries || []} />
    </div>
  );
}
