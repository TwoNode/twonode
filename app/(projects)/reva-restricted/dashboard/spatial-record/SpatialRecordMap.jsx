"use client";

export default function SpatialRecordMap({ html }) {
  if (!html) return <div>Not authorized or file not found.</div>;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
