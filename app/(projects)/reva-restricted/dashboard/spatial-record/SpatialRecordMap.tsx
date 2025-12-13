"use client";

import { useEffect, useRef } from "react";

export default function SpatialRecordMap({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!html || !containerRef.current) return;

    // Set the HTML content
    containerRef.current.innerHTML = html;

    // Extract and execute all script tags
    const scripts = containerRef.current.querySelectorAll("script");
    scripts.forEach((script) => {
      const newScript = document.createElement("script");

      // Copy all attributes from the original script
      Array.from(script.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Copy the script content
      newScript.textContent = script.textContent;

      // Replace the original script with the new one
      script.parentNode?.replaceChild(newScript, script);
    });
  }, [html]);

  if (!html) return <div>Not authorized or file not found.</div>;

  return <div ref={containerRef} />;
}
