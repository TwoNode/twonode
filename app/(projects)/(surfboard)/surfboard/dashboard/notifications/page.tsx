"use client";

import React, { useState } from "react";

const sampleNotifications = [
  { id: 1, type: "info", title: "Welcome", message: "Welcome to Surfboard!" },
  {
    id: 2,
    type: "success",
    title: "Plan Uploaded",
    message: "Your survey plan was uploaded successfully.",
  },
  {
    id: 3,
    type: "warning",
    title: "Incomplete Profile",
    message: "Please complete your profile to access all features.",
  },
  {
    id: 4,
    type: "error",
    title: "Upload Failed",
    message: "There was an error uploading your plan.",
  },
];

const typeColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(sampleNotifications);

  const markAsRead = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    // TODO: Mark as read in backend
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Notifications</h1>
      <div className="space-y-4">
        {notifications.length === 0 && (
          <div className="text-blue-700">No notifications.</div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg p-4 shadow flex items-center justify-between ${
              typeColors[n.type]
            }`}
          >
            <div>
              <div className="font-semibold">{n.title}</div>
              <div className="text-sm">{n.message}</div>
            </div>
            <button
              className="ml-4 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
              onClick={() => markAsRead(n.id)}
            >
              Mark as Read
            </button>
          </div>
        ))}
      </div>
      {/* TODO: Integrate with backend notification system */}
    </div>
  );
}
