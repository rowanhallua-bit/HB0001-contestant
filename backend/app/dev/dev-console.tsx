"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MeResponse, OrganizationsResponse, Session } from "@/lib/contracts/auth";

type Turnstile = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

type LogEntry = { at: string; label: string; status: number; body: unknown };

const box: React.CSSProperties = { border: "1px solid #ccc", borderRadius: 6, padding: 12, marginBottom: 12, maxWidth: 720 };
const input: React.CSSProperties = { padding: 6, marginRight: 8, minWidth: 260 };

export default function DevConsole({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [orgs, setOrgs] = useState<OrganizationsResponse["organizations"]>([]);
  const [displayName, setDisplayName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!turnstileSiteKey || !window.turnstile || !widgetRef.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: turnstileSiteKey,
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(null),
    });
  }, [turnstileSiteKey]);

  useEffect(renderWidget, [renderWidget]);

  async function call(label: string, path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const body: unknown = await res.json().catch(() => null);
    // Never log tokens in the panel.
    const shown = body && typeof body === "object" && "session" in body ? { ...body, session: "[hidden]" } : body;
    setLog((l) => [{ at: new Date().toLocaleTimeString(), label, status: res.status, body: shown }, ...l].slice(0, 30));
    return { ok: res.ok, body };
  }

  async function requestCode() {
    await call("request-code", "/api/auth/request-code", {
      method: "POST",
      body: { email, ...(captchaToken ? { captchaToken } : {}) },
    });
    // Turnstile tokens are single-use.
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    setCaptchaToken(null);
  }

  async function verifyCode() {
    const r = await call("verify-code", "/api/auth/verify-code", { method: "POST", body: { email, code } });
    if (r.ok) {
      const s = (r.body as { session: Session }).session;
      setSession(s);
      await loadMe(s.accessToken);
    }
  }

  async function loadMe(token = session?.accessToken) {
    if (!token) return;
    const r = await call("me", "/api/me", { token });
    if (r.ok) setMe(r.body as MeResponse);
    const o = await call("organizations", "/api/organizations", { token });
    if (o.ok) setOrgs((o.body as OrganizationsResponse).organizations);
  }

  async function onboard() {
    if (!session) return;
    await call("onboarding", "/api/onboarding", {
      method: "POST",
      token: session.accessToken,
      body: { displayName, ...(orgId ? { organizationId: orgId } : {}) },
    });
    await loadMe();
  }

  async function refresh() {
    if (!session) return;
    const r = await call("refresh", "/api/auth/refresh", { method: "POST", body: { refreshToken: session.refreshToken } });
    if (r.ok) setSession((r.body as { session: Session }).session);
  }

  async function logout() {
    if (!session) return;
    await call("logout", "/api/auth/logout", { method: "POST", token: session.accessToken });
    setSession(null);
    setMe(null);
    setOrgs([]);
  }

  return (
    <main>
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderWidget} />
      )}
      <h1>Bidd /dev</h1>
      <p style={{ color: "#a00" }}>Test UI for the backend team. Not the product.</p>

      <section style={box}>
        <h2>1. Request a code</h2>
        <input style={input} type="email" placeholder="you@crimson.ua.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button onClick={requestCode} disabled={!email}>Send code</button>
        {turnstileSiteKey ? <div ref={widgetRef} style={{ marginTop: 8 }} /> : <p><small>No Turnstile site key: sending without CAPTCHA.</small></p>}
      </section>

      <section style={box}>
        <h2>2. Enter the code</h2>
        <input style={input} inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        <button onClick={verifyCode} disabled={!email || !code}>Verify</button>
        {session && <p>Signed in. Token expires {new Date(session.expiresAt * 1000).toLocaleTimeString()}.</p>}
      </section>

      <section style={box}>
        <h2>3. Account</h2>
        <button onClick={() => loadMe()} disabled={!session}>Reload /api/me</button>{" "}
        <button onClick={refresh} disabled={!session}>Refresh session</button>{" "}
        <button onClick={logout} disabled={!session}>Log out</button>
        {me && (
          <div style={{ marginTop: 8, borderLeft: `6px solid ${me.campus.theme.primary ?? "#999"}`, paddingLeft: 8 }}>
            <strong>{me.user.displayName ?? "(no display name yet)"}</strong> · {me.user.email}
            <br />
            {me.campus.name} ({me.campus.conference}) · {me.badges.map((b) => b.label).join(", ")}
            <br />
            Chapters: {me.memberships.length ? me.memberships.map((m) => `${m.organization?.name ?? "?"} (${m.status})`).join(", ") : "none"}
          </div>
        )}
      </section>

      <section style={box}>
        <h2>4. Onboarding</h2>
        <input style={input} placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: 6, marginRight: 8 }}>
          <option value="">No chapter</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button onClick={onboard} disabled={!session || displayName.trim().length < 2}>Save</button>
      </section>

      <section style={box}>
        <h2>Responses</h2>
        {log.map((entry, i) => (
          <details key={i} open={i === 0}>
            <summary>
              {entry.at} {entry.label} → {entry.status}
            </summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(entry.body, null, 2)}</pre>
          </details>
        ))}
      </section>
    </main>
  );
}
