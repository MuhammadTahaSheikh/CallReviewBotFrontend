"use client";

import { useEffect, useState } from "react";

export default function DemoBanner() {
  const [mode, setMode] = useState("live");

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.aiMode) setMode(data.aiMode);
      })
      .catch(() => {});
  }, []);

  if (mode === "live") {
    return (
      <div className="demo-banner" role="status">
        <strong>Live xAI</strong>
        <span>
          {" "}
          — call analysis and Practice Studio customer replies use Grok. Avoid uploading real patient/PHI data.
        </span>
      </div>
    );
  }

  return (
    <div className="demo-banner" role="status">
      <strong>Demo environment</strong>
      <span> — synthetic / labeled outputs only.</span>
    </div>
  );
}
