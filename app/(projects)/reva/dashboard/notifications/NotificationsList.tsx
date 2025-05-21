"use client";

import { Bell, CheckCircle2, Info, AlertTriangle, XCircle, Settings, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM" | "PAYMENT" | "PROPERTY";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userIds?: string[];
  readBy: string[];
  dismissedBy: string[];
  metadata?: any;
  link?: string | null;
  createdAt: string;
};

const notifications: Notification[] = [
  {
    id: "n1",
    type: "PAYMENT",
    title: "Payment Received",
    message: "₦40,000 for REVA_123456 has been confirmed.",
    createdAt: new Date().toISOString(),
    readBy: [],
    dismissedBy: [],
    userIds: [],
  },
  {
    id: "n2",
    type: "PROPERTY",
    title: "New Property Request",
    message: "You have a new due diligence request from Yusuf.",
    createdAt: new Date().toISOString(),
    readBy: [],
    dismissedBy: [],
    userIds: [],
  },
  {
    id: "n3",
    type: "WARNING",
    title: "Incomplete Payment",
    message: "Payment for REVA_999999 is pending confirmation.",
    createdAt: new Date().toISOString(),
    readBy: [],
    dismissedBy: [],
    userIds: [],
  },
];

const typeIconMap: Record<NotificationType, JSX.Element> = {
  SUCCESS: <CheckCircle2 className="text-green-500 w-5 h-5" />,
  INFO: <Info className="text-blue-500 w-5 h-5" />,
  WARNING: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
  ERROR: <XCircle className="text-red-500 w-5 h-5" />,
  SYSTEM: <Settings className="text-muted w-5 h-5" />,
  PAYMENT: <Landmark className="text-indigo-500 w-5 h-5" />,
  PROPERTY: <Bell className="text-purple-500 w-5 h-5" />,
};

export default function NotificationsList() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Bell className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Notifications</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px] space-y-4 pr-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-3 border rounded-md ${
                  notif.readBy.length ? "bg-muted/40" : "bg-white dark:bg-slate-900"
                }`}
              >
                <div className="mt-1">{typeIconMap[notif.type]}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-sm">{notif.title}</h3>
                      <p className="text-muted-foreground text-sm">{notif.message}</p>
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {format(new Date(notif.createdAt), "dd MMM, hh:mm a")}
                    </Badge>
                  </div>
                  {notif.link && (
                    <a
                      href={notif.link}
                      className="text-xs mt-2 inline-block text-blue-600 underline"
                    >
                      View Details
                    </a>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
