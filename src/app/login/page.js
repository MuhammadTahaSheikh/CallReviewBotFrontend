"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/";
  }, [searchParams]);

  const [mode, setMode] = useState("signin"); // signin | signup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signError) throw signError;
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const name = fullName.trim();
      if (name.length < 2) {
        throw new Error("Please enter your full name.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          data: {
            full_name: name,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setInfo("Check your email to confirm your account, then sign in.");
      setMode("signin");
    } catch (err) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card panel panel-pad">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            <LogIn size={18} />
          </div>
          <div>
            <h1 className="login-title">Call Intelligence</h1>
            <p className="muted" style={{ margin: 0 }}>
              Sign in to review calls and practice
            </p>
          </div>
        </div>

        <div className="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`login-tab ${mode === "signin" ? "active" : ""}`}
            aria-selected={mode === "signin"}
            onClick={() => {
              setMode("signin");
              setError("");
              setInfo("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            className={`login-tab ${mode === "signup" ? "active" : ""}`}
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setError("");
              setInfo("");
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "signup" ? (
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
              />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          {mode === "signup" ? (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </label>
          ) : null}

          {error ? (
            <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          ) : null}
          {info ? (
            <p role="status" style={{ color: "var(--ok)", margin: 0 }}>
              {info}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
            {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="muted" style={{ fontSize: "0.78rem", margin: "14px 0 0" }}>
          Auth is powered by Supabase. Webhooks stay secret-based and do not use this login.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
