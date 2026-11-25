"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";
import Sidebar from "./Sidebar";
import DemoBanner from "./DemoBanner";
import { useTheme } from "./ThemeProvider";

function isAuthRoute(pathname) {
  return pathname === "/login" || pathname.startsWith("/auth");
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setThemeReady(true);
  }, []);

  if (isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="app-main">
        <DemoBanner />
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="topbar-spacer" />
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            suppressHydrationWarning
          >
            {themeReady && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
