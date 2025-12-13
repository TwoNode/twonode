"use client";

import { useState } from "react";

const headerExamples = [
  // pillarNumber examples
  {
    field: "pillarNumber",
    original: "pillarNumber",
    processed: "pillarnumber",
  },
  {
    field: "pillarNumber",
    original: "PillarNumber",
    processed: "pillarnumber",
  },
  {
    field: "pillarNumber",
    original: "Pillar Number",
    processed: "pillarnumber",
  },
  {
    field: "pillarNumber",
    original: "pillar number",
    processed: "pillarnumber",
  },
  {
    field: "pillarNumber",
    original: "Pillar   Number",
    processed: "pillarnumber",
  },
  // easting examples
  { field: "easting", original: "easting", processed: "easting" },
  { field: "easting", original: "Easting", processed: "easting" },
  { field: "easting", original: "East ing", processed: "easting" },
  { field: "easting", original: "EASTING", processed: "easting" },
  // northing examples
  { field: "northing", original: "northing", processed: "northing" },
  { field: "northing", original: "Northing", processed: "northing" },
  { field: "northing", original: "North ing", processed: "northing" },
  { field: "northing", original: "NORTHING", processed: "northing" },
];

export default function SurfboardCSVHeaderHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ margin: "1em 0" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#f0f0f0",
          border: "1px solid #ccc",
          padding: "0.5em 1em",
          borderRadius: "4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5em",
        }}
      >
        {isOpen ? "▼" : "▶"} CSV Header Help
      </button>
      
      {isOpen && (
        <div
          style={{
            marginTop: "0.5em",
            padding: "1em",
            background: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #eee",
          }}
        >
          <p>
            The following header formats are all accepted for the{" "}
            <b>pillarNumber</b>, <b>easting</b>, and <b>northing</b> columns:
          </p>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  Field
                </th>
                <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  Original Header
                </th>
                <th style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                  After Processing
                </th>
              </tr>
            </thead>
            <tbody>
              {headerExamples.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                    {row.field}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                    {row.original}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>
                    {row.processed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "1em" }}>
            <b>Note:</b> The system automatically processes header capitalization
            and spaces. Please ensure your CSV includes these required columns.
          </p>
        </div>
      )}
    </div>
  );
}
