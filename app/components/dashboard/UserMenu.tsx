"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signIn, signOut } from "next-auth/react";
import { LogOut, Settings, UserRound, X } from "lucide-react";

export type AppUser = { name?: string | null; email?: string | null; image?: string | null };

export default function UserMenu() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => { if (active) setUser(data?.user ?? null); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as Element)?.closest?.(".user-popover")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function loginWithGoogle() {
    setLoginLoading(true);
    setLoginError("");
    try {
      const result = await signIn("google", { callbackUrl: "/openings/setup", redirect: false });
      if (result?.error) {
        setLoginError(
          result.error === "Configuration"
            ? "Google login is not configured. Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to .env.local."
            : "Google login could not be started. Check the authentication configuration."
        );
        return;
      }
      if (result?.url) window.location.href = result.url;
    } catch (error) {
      console.error("Google login failed:", error);
      setLoginError("Google login could not be started. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    await signOut({ callbackUrl: window.location.href });
  }

  const displayName = user?.name || user?.email || "Account";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="dashboard-avatar-button" aria-label="Account" onClick={() => user ? setOpen((v) => !v) : setLoginOpen(true)}>
        {user ? <span className="avatar-initial">{initial}</span> : <UserRound size={18} />}
      </button>

      {open && user && typeof document !== "undefined" && createPortal(
        <div className="user-popover user-popover-portal" style={{ top: "58px", right: "24px" }}>
          <div className="user-popover-head">
            <div className="avatar-large">{initial}</div>
            <div><strong>{displayName}</strong><span>{user.email}</span></div>
          </div>
          <div className="user-popover-divider" />
          <Link href="/profile" onClick={() => setOpen(false)}><Settings size={16} /> Update profile</Link>
          <button onClick={logout}><LogOut size={16} /> Logout</button>
        </div>,
        document.body
      )}

      {loginOpen && typeof document !== "undefined" && createPortal(
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="google-login-modal">
            <button className="modal-close" aria-label="Close" onClick={() => setLoginOpen(false)}><X size={18} /></button>
            <div className="google-mark">G</div>
            <span className="modal-eyebrow">Welcome to OpportuneX</span>
            <h2>Sign in with Google</h2>
            <p>Use your Google account to save your profile, jobs, activity and preferences.</p>
            <button className="google-login-button" onClick={loginWithGoogle} disabled={loginLoading}><span className="google-letter">G</span> {loginLoading ? "Connecting…" : "Continue with Google"}</button>
            {loginError && <p className="route-error-text" role="alert">{loginError}</p>}
            <small>You will be redirected to Google for secure authentication. Your password is never handled by OpportuneX.</small>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
