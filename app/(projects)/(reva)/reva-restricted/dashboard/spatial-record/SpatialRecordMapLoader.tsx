"use client";

import dynamic from "next/dynamic";

// Browser-only: ArcGIS touches window, and keeping it out of the server
// render keeps the production build fast.
const SpatialRecordMap = dynamic(() => import("./SpatialRecordMap"), {
  ssr: false,
});

export default SpatialRecordMap;
