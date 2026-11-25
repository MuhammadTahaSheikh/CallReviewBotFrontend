"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function UserMenu() {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          // Fall back to supabase client display
          const supabase = createClient();
          const { data } = await supabase.auth.getUser();
          if (!mounted) return;
          const user = data.user;
          const name = user?.user_metadata?.full_name || "";
          setProfile({
            label: name || user?.email || "Signed in",
            email: user?.email || "",
            initial: (name || user?.email || "?").charAt(0).toUpperCase(),
            roleLabel: "User",
          });
          setReady(true);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        const name = data.appUser?.fullName || "";
        const email = data.appUser?.email || "";
        setProfile({
          label: name || email || "Signed in",
          email,
          initial: (name || email || "?").charAt(0).toUpperCase(),
          roleLabel: data.appUser?.isAdmin ? "Admin" : "User",
        });
        setReady(true);
      } catch {
        if (mounted) setReady(true);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !profile) {
    return (
      <div className="reviewer-chip">
        <div className="reviewer-avatar" aria-hidden="true">
          …
        </div>
        <div>
          <div className="reviewer-name">Loading…</div>
          <div className="reviewer-role">Signed in</div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <div className="reviewer-chip">
        <div className="reviewer-avatar" aria-hidden="true">
          {profile.initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="reviewer-name" title={profile.email || profile.label}>
            {profile.label}
          </div>
          <div className="reviewer-role">
            {profile.roleLabel}
            {profile.email ? ` · ${profile.email}` : ""}
          </div>
        </div>
      </div>
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn btn-secondary user-signout" aria-label="Sign out">
          <LogOut size={14} />
          Sign out
        </button>
      </form>
    </div>
  );
}
