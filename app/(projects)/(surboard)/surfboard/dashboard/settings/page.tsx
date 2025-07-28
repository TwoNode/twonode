"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  // Sample user data
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email] = useState("john.doe@example.com");
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save profile and preferences to backend
    alert("Profile and preferences saved!");
  };

  return (
    <main className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Settings</h1>
      <form className="space-y-6" onSubmit={handleSave}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">First Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Last Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              className="input input-bordered w-full"
              value={email}
              readOnly
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-semibold">Theme:</label>
          <select
            className="input input-bordered"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-semibold">Notifications:</label>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
        </div>
        <div>
          <button
            type="submit"
            className="px-8 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
          >
            Save Changes
          </button>
        </div>
      </form>
      <div className="mt-8">
        <button className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
          Change Password
        </button>
        {/* TODO: Implement change password logic if supported */}
      </div>
    </main>
  );
}
