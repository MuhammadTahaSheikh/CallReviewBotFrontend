import { Suspense } from "react";

export default function NewPracticeLayout({ children }) {
  return <Suspense fallback={<div className="panel panel-pad">Loading setup…</div>}>{children}</Suspense>;
}
