"use client";
// Mock sign-in: school email → 6-digit code → campus confirmation. The campus comes from the email
// domain, and the page repaints in its colors the moment it's verified. Any 6 digits work.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";
import { campusTheme } from "@/lib/brand/campus";
import { BiddWordmark } from "@/lib/brand/bidd-logo";
import { Alert, Arrow, Check } from "./icons";

export type LoginCampus = {
  slug: string;
  name: string;
  full_name: string;
  email_domains: string[];
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  logo_url_dark: string | null;
};

const DEMO = [
  { label: "Alabama", email: "taylorm@crimson.ua.edu" },
  { label: "Ole Miss", email: "taylorm@go.olemiss.edu" },
  { label: "LSU", email: "taylorm@lsu.edu" },
  { label: "Vanderbilt (new campus)", email: "taylorm@vanderbilt.edu" },
];

const match = (email: string, campuses: LoginCampus[]) => {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return campuses.find((c) => c.email_domains.some((d) => domain === d || domain.endsWith(`.${d}`))) ?? null;
};

export function LoginFlow({ campuses, labQuery, initialEmail, logos }: { campuses: LoginCampus[]; labQuery: string; initialEmail: string; logos: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "campus">("email");
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const campus = step === "campus" ? match(email, campuses) : null;
  const theme = campus ? campusTheme({ primary: campus.primary_color, secondary: campus.secondary_color }) : undefined;

  const send = (value = email) => {
    const e = value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setError("Enter your full school email, like you@crimson.ua.edu.");
    if (!match(e, campuses))
      return setError(
        e.endsWith(".edu")
          ? `Bidd isn't open at ${e.split("@")[1]} yet. It's SEC schools only for now.`
          : "Use your school email, the one that ends in .edu. That's how Bidd knows your campus.",
      );
    setEmail(e);
    setError(null);
    setStep("code");
    setTimeout(() => boxes.current[0]?.focus(), 50);
  };

  const put = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) boxes.current[i + 1]?.focus();
    if (next.every(Boolean)) setTimeout(() => setStep("campus"), 250);
  };

  const domain = email.split("@")[1];
  const next = campus ? `/onboarding?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(labQuery)), school: campus.slug })}` : "/";

  return (
    <div style={theme as CSSProperties} data-duo="tape" className="grid min-h-dvh bg-paper text-ink md:grid-cols-2">
      {/* Poster side: black and white until the campus arrives, then the 1 and the stripe take its colors. */}
      <div data-ground="dark" className="relative flex flex-col justify-between overflow-hidden bg-ink p-[clamp(24px,4vw,56px)] text-paper">
        <Link href={labQuery ? `/?${labQuery}` : "/"} aria-label="Bidd home">
          <BiddWordmark tone="dark" className="h-8 w-auto text-paper" />
        </Link>
        <div className="py-16">
          <p className="display text-[clamp(4rem,9vw,8.5rem)]">Be 1 of 1.</p>
          <p className="mt-5 max-w-[34ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-[var(--dim)]">
            The closet for SEC Greek life. Resell your rush wardrobe, shop your chapter&apos;s drops, and every sale counts toward your chapter.
          </p>
        </div>
        <p className="text-[13px] text-[var(--dim)]">Demo sign-in. No email is sent, and any 6-digit code works.</p>
        {campus && <div className="tape absolute inset-x-0 bottom-0" aria-hidden="true" />}
      </div>

      <div className="flex flex-col justify-center p-[clamp(24px,5vw,72px)]">
        <div className="w-full max-w-[460px]">
          {step === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <h1 className="display text-[clamp(3rem,5vw,4.5rem)]">Sign in.</h1>
              <p className="muted mt-4 text-[17px] leading-relaxed">Bidd is campus-verified. Use your school email and your campus comes with it.</p>
              <label htmlFor="email" className="mt-8 block text-[14px] font-semibold">
                School email
              </label>
              <div className="mt-2 flex gap-2 rounded-full border-2 border-ink p-1.5 focus-within:border-[var(--campus-line)]">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@crimson.ua.edu"
                  className="min-w-0 flex-1 bg-transparent px-4 text-[17px] outline-none placeholder:text-[var(--gray-600)]"
                />
                <button className="pill pill-ink pill-sm">Send code</button>
              </div>
              <p className="mt-3 flex min-h-6 items-start gap-2 text-[15px] font-semibold" role="status">
                {error && (
                  <>
                    <Alert width={20} height={20} className="mt-0.5 shrink-0" /> {error}
                  </>
                )}
              </p>
              <div className="mt-8 border-t border-[var(--gray-100)] pt-6">
                <p className="text-[14px] font-semibold">Demo accounts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEMO.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      className="chip chip-quiet"
                      onClick={() => {
                        setEmail(d.email);
                        send(d.email);
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {step === "code" && (
            <div>
              <h1 className="display text-[clamp(3rem,5vw,4.5rem)]">Check your email.</h1>
              <p className="muted mt-4 text-[17px] leading-relaxed">
                We sent a 6-digit code to <b className="text-ink">{email}</b>. For the demo, any 6 digits work.
              </p>
              <div
                className="mt-8 flex gap-2"
                onPaste={(e) => {
                  const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  if (v.length === 6) {
                    e.preventDefault();
                    setCode(v.split(""));
                    setTimeout(() => setStep("campus"), 250);
                  }
                }}
              >
                {code.map((c, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    value={c}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label={`Digit ${i + 1}`}
                    onChange={(e) => put(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Backspace" && !c && i > 0 && boxes.current[i - 1]?.focus()}
                    className="h-[60px] w-[52px] rounded-[4px] border-2 border-ink bg-paper text-center text-[24px] font-semibold outline-none focus:border-[var(--campus-line)]"
                  />
                ))}
              </div>
              <button type="button" className="mt-6 text-[15px] font-semibold underline underline-offset-4" onClick={() => setStep("email")}>
                Use a different email
              </button>
            </div>
          )}

          {step === "campus" && campus && (
            <div>
              <div className="flex items-center gap-4">
                {logos === "official" && campus.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={campus.logo_url} alt={`${campus.name} logo`} width={72} height={72} className="size-[72px] object-contain" />
                ) : (
                  <span className="field display inline-flex h-14 items-center rounded-[4px] px-3 pt-1 text-[28px]">{campus.name}</span>
                )}
                <span className="stamp">
                  <Check width={16} height={16} strokeWidth={3} /> Verified
                </span>
              </div>
              <h1 className="display mt-8 text-[clamp(3rem,5vw,4.5rem)]">You&apos;re in at {campus.name}.</h1>
              <p className="mt-5 flex flex-wrap items-center gap-x-2 text-[17px] font-semibold">
                {domain} <Arrow width={18} height={18} /> {campus.full_name}
              </p>
              <p className="muted mt-3 text-[16px] leading-relaxed">
                Your feed, drops and the Cup are {campus.name}&apos;s now. Next, pick your chapter so your sales count toward it.
              </p>
              <div className="tape mt-8" aria-hidden="true" />
              <button type="button" className="pill pill-ink mt-8" onClick={() => router.push(next)}>
                Pick your chapter <Arrow width={18} height={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
