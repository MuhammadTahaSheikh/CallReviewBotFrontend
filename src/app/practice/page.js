import Link from "next/link";
import { History, LineChart, Play } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";

export default function PracticeStudioHome() {
  return (
    <div>
      <PageHeader
        title="Call Practice Studio"
        description="Practice realistic business conversations. The simulated customer is powered by live xAI (Grok)."
      />

      <div className="pill-note" style={{ marginBottom: 16 }}>
        Practice data stays separate from real call analytics, CRM tasks, and exception queues.
      </div>

      <div className="team-grid">
        <Link href="/practice/new" className="panel panel-pad" style={{ display: "block" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <Play size={18} />
            <h2 className="panel-title" style={{ margin: 0 }}>
              Start New Practice
            </h2>
          </div>
          <p className="panel-sub" style={{ margin: 0 }}>
            Choose a call category, scenario, and difficulty, then begin a simulated conversation.
          </p>
        </Link>

        <Link href="/practice/history" className="panel panel-pad" style={{ display: "block" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <History size={18} />
            <h2 className="panel-title" style={{ margin: 0 }}>
              Practice History
            </h2>
          </div>
          <p className="panel-sub" style={{ margin: 0 }}>
            Review past practice sessions, transcripts, and evaluation reports.
          </p>
        </Link>

        <Link href="/practice/performance" className="panel panel-pad" style={{ display: "block" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <LineChart size={18} />
            <h2 className="panel-title" style={{ margin: 0 }}>
              Practice Performance
            </h2>
          </div>
          <p className="panel-sub" style={{ margin: 0 }}>
            See practice-only trends, averages, and coaching themes from stored sessions.
          </p>
        </Link>
      </div>
    </div>
  );
}
