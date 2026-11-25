"use client";

import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";

const DEFAULT_POLICY = {
  qaSampleRatePercent: 5,
  autoCreateCrmTasks: true,
  autoCreateCoachingTasks: true,
  autoQueueCustomerDrafts: true,
  neverSendCustomerMessages: true,
  requireHumanReviewForHighRisk: true,
  queueMediumRisk: false,
  highRiskKeywords: ["refund", "lawyer", "lawsuit", "HIPAA", "malpractice"],
  mediumRiskKeywords: ["angry", "furious", "unacceptable", "complaint"],
};

export default function SettingsPage() {
  const [profiles, setProfiles] = useState([]);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [aiMode, setAiMode] = useState("demo");
  const [viewer, setViewer] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.status === 403) {
      setUsers([]);
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load users");
    setUsers(data.users || []);
    if (data.viewer) setViewer(data.viewer);
  }

  useEffect(() => {
    async function load() {
      try {
        const [profilesRes, meRes] = await Promise.all([fetch("/api/profiles"), fetch("/api/me")]);
        const data = await profilesRes.json();
        if (!profilesRes.ok) throw new Error(data.error || "Failed to load settings");
        setProfiles(data.profiles || []);
        setPolicy({ ...DEFAULT_POLICY, ...(data.policy || {}) });
        setAiMode(data.aiMode || "demo");

        if (meRes.ok) {
          const me = await meRes.json();
          setViewer(me.appUser || null);
          if (me.appUser?.isAdmin) await loadUsers();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function changeRole(userId, role) {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      setMessage(`${data.user.email} is now ${data.user.role}`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggle(key) {
    setPolicy((prev) => ({ ...prev, [key]: !prev[key] }));
    setMessage("");
  }

  const canEditPolicy = Boolean(viewer?.isAdmin);

  async function savePolicy() {
    if (!canEditPolicy) {
      setError("Only admins can change policy settings.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qaSampleRatePercent: Number(policy.qaSampleRatePercent),
          autoCreateCrmTasks: Boolean(policy.autoCreateCrmTasks),
          autoCreateCoachingTasks: Boolean(policy.autoCreateCoachingTasks),
          autoQueueCustomerDrafts: Boolean(policy.autoQueueCustomerDrafts),
          neverSendCustomerMessages: true,
          requireHumanReviewForHighRisk: Boolean(policy.requireHumanReviewForHighRisk),
          queueMediumRisk: Boolean(policy.queueMediumRisk),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPolicy({ ...DEFAULT_POLICY, ...data.policy });
      setMessage("Policy saved. New analyzes will use these rules.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description={
          canEditPolicy
            ? "Scoring profiles and policy controls. Only admins can change the policy engine."
            : "View scoring profiles and current policy. Policy changes are admin-only."
        }
        actions={
          canEditPolicy ? (
            <button type="button" className="btn btn-primary" onClick={savePolicy} disabled={loading || saving}>
              {saving ? "Saving…" : "Save policy"}
            </button>
          ) : null
        }
      />

      {loading ? (
        <div className="panel panel-pad muted">Loading settings…</div>
      ) : (
        <div className="stack">
          {error ? (
            <div className="panel panel-pad" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="panel panel-pad" style={{ color: "var(--ok)" }}>
              {message}
            </div>
          ) : null}

          <section className="panel panel-pad">
            <h2 className="panel-title">AI mode</h2>
            <p className="panel-sub" style={{ marginBottom: 0 }}>
              Current mode: <strong>{aiMode}</strong>
              {aiMode === "demo" ? " — synthetic labeled outputs." : " — live xAI (Grok) for analysis and practice."}
            </p>
          </section>

          {viewer?.isAdmin ? (
            <section className="panel panel-pad">
              <h2 className="panel-title">Users & roles</h2>
              <p className="panel-sub">
                You are the admin. Normal users only see their own calls. Promote someone to admin to grant full
                visibility.
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.fullName || "—"}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.isAdmin ? "badge-warn" : "badge-neutral"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          {u.isAdmin ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                              onClick={() => changeRole(u.id, "user")}
                            >
                              Make user
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                              onClick={() => changeRole(u.id, "admin")}
                            >
                              Make admin
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!users.length ? (
                      <tr>
                        <td colSpan={4} className="muted">
                          No other accounts yet — they appear after someone signs up.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="panel panel-pad">
              <h2 className="panel-title">Your role</h2>
              <p className="panel-sub" style={{ marginBottom: 0 }}>
                You are a <strong>normal user</strong>. You only see calls and practice sessions you create. Ask an
                admin to promote you if you need org-wide access.
              </p>
            </section>
          )}

          <section className="panel panel-pad">
            <h2 className="panel-title">Scoring profiles</h2>
            <p className="panel-sub">Weights must sum to 100 · stored separately from processing code</p>
            <div className="stack">
              {profiles.map((profile) => (
                <div key={profile.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{profile.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(profile.categories || []).map((cat) => (
                      <span key={cat.key} className="badge badge-neutral">
                        {cat.label} {cat.weight}%
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel-pad">
            <h2 className="panel-title">Policy engine</h2>
            <p className="panel-sub">
              {canEditPolicy
                ? "These settings control routing and dummy action permissions"
                : "Read-only for your role — ask an admin if something needs to change"}
            </p>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="qa">QA sample rate (%)</label>
                <input
                  id="qa"
                  type="number"
                  min={0}
                  max={100}
                  value={policy.qaSampleRatePercent ?? 5}
                  disabled={!canEditPolicy}
                  onChange={(e) => {
                    setPolicy((prev) => ({
                      ...prev,
                      qaSampleRatePercent: Number(e.target.value),
                    }));
                    setMessage("");
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="keywords">High-risk keywords</label>
                <input
                  id="keywords"
                  value={(policy.highRiskKeywords || DEFAULT_POLICY.highRiskKeywords).join(", ")}
                  readOnly
                />
              </div>
            </div>

            <div className="stack" style={{ marginTop: 16 }}>
              {[
                ["requireHumanReviewForHighRisk", "Require human review for high-risk calls"],
                ["queueMediumRisk", "Also queue medium-risk complaint calls"],
                ["autoCreateCrmTasks", "Auto-create CRM follow-up tasks (dummy)"],
                ["autoCreateCoachingTasks", "Auto-create coaching tasks (dummy)"],
                ["autoQueueCustomerDrafts", "Queue customer follow-up drafts (never send)"],
                ["neverSendCustomerMessages", "Never send customer-facing messages (locked on)"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: canEditPolicy && key !== "neverSendCustomerMessages" ? "pointer" : "default",
                    opacity: canEditPolicy || key === "neverSendCustomerMessages" ? 1 : 0.85,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(policy[key])}
                    disabled={!canEditPolicy || key === "neverSendCustomerMessages"}
                    onChange={() => toggle(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
