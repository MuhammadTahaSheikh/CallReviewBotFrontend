"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertOctagon,
  BarChart3,
  History,
  LayoutDashboard,
  Mic2,
  Plug,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import UserMenu from "./UserMenu";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze Call", icon: Mic2 },
  { href: "/practice", label: "Call Practice Studio", icon: Sparkles },
  { href: "/history", label: "Call History", icon: History },
  { href: "/team", label: "Team Performance", icon: Users },
  { href: "/exceptions", label: "Exception Queue", icon: AlertOctagon },
  { href: "/automation", label: "Automation Activity", icon: Activity },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="brand-name">Call Intelligence</div>
            <div className="brand-sub">AI review platform</div>
          </div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${active ? "active" : ""}`}
                onClick={onClose}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
