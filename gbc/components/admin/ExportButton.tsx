"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { gbcApi } from "@/gbc/apiClient";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "csv" | "excel") {
    setIsExporting(true);
    try {
      const result = await gbcApi.tickets.admin.export();

      if (result.success && result.data) {
        const tickets = result.data;

        if (format === "csv") {
          exportToCSV(tickets);
        } else {
          exportToExcel(tickets);
        }

        toast.success("Export completed successfully");
      } else {
        toast.error("Failed to export tickets");
      }
    } catch (error) {
      toast.error("An error occurred during export");
    } finally {
      setIsExporting(false);
    }
  }

  function exportToCSV(tickets: any[]) {
    // Create CSV headers
    const headers = [
      "Ticket Number",
      "Name",
      "Email",
      "Phone",
      "Gender",
      "Profession",
      "Ticket Type",
      "Price",
      "Checked In",
      "Check-in Time",
      "Registration Date",
    ];

    // Create CSV rows
    const rows = tickets.map((ticket) => [
      ticket.ticketNumber,
      ticket.name,
      ticket.email,
      ticket.phone || "",
      ticket.gender,
      ticket.profession,
      ticket.ticketType,
      ticket.price,
      ticket.checkedIn ? "Yes" : "No",
      ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleString() : "",
      new Date(ticket.createdAt).toLocaleString(),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `GBC2_Attendees_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToExcel(tickets: any[]) {
    // For Excel format, we'll create a more detailed HTML table
    // that Excel can read when saved as .xls
    const htmlContent = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #667eea; color: white; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Ticket Number</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Profession</th>
                <th>Ticket Type</th>
                <th>Price (₦)</th>
                <th>Checked In</th>
                <th>Check-in Time</th>
                <th>Registration Date</th>
              </tr>
            </thead>
            <tbody>
              ${tickets
                .map(
                  (ticket) => `
                <tr>
                  <td>${ticket.ticketNumber}</td>
                  <td>${ticket.name}</td>
                  <td>${ticket.email}</td>
                  <td>${ticket.phone || ""}</td>
                  <td>${ticket.gender}</td>
                  <td>${ticket.profession}</td>
                  <td>${ticket.ticketType}</td>
                  <td>${ticket.price.toLocaleString()}</td>
                  <td>${ticket.checkedIn ? "Yes" : "No"}</td>
                  <td>${
                    ticket.checkedInAt
                      ? new Date(ticket.checkedInAt).toLocaleString()
                      : ""
                  }</td>
                  <td>${new Date(ticket.createdAt).toLocaleString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `GBC2_Attendees_${new Date().toISOString().split("T")[0]}.xls`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isExporting}>
          {isExporting ? (
            "Exporting..."
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Attendees
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
