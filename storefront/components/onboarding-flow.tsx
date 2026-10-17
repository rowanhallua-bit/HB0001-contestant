"use client";
// Mock onboarding (build.md /onboarding): pick your chapter (join code optional), then your sizes.
import Link from "next/link";
import { useState } from "react";
import { Arrow, Check } from "./icons";

type ChapterOption = { id: string; slug: string; name: string; sub: string; letters: boolean };

const SIZES = {
  Tops: ["XS", "S", "M", "L", "XL"],
  Dresses: ["0", "2", "4", "6", "8", "10"],
  Shoes: ["6", "7", "8", "9", "10", "11"],
};

export function OnboardingFlow({ campus, chapters, feedHref, closetHref }: { campus: string; chapters: ChapterOption[]; feedHref: string; closetHref: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chapter, setChapter] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const picked = chapters.find((c) => c.id === chapter);
  const toggle = (s: string) => setSizes((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  return (
    <div className="column pt-10 pb-24 md:pt-14">
      <p className="muted text-[14px] font-semibold">{step < 3 ? `Step ${step} of 2` : "Done"}</p>

      {step === 1 && (
        <>
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Pick your chapter.</h1>
          <p className="muted mt-4 max-w-[56ch] text-[17px] leading-relaxed">Every piece you sell on Bidd is points for your chapter in the Fall Cup. You can change this later.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chapters.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={chapter === c.id}
                  onClick={() => setChapter(c.id)}
                  className="flex h-full w-full flex-col items-start gap-3 rounded-[4px] border-2 border-[var(--gray-200)] p-5 text-left transition-colors duration-300 hover:border-ink aria-pressed:border-[var(--campus)] aria-pressed:bg-[var(--campus)] aria-pressed:text-[var(--campus-ink)]"
                >
                  <span className={`display ${c.letters ? "text-[44px]" : "text-[30px]"}`}>{c.name}</span>
                  <span className="text-[14px] font-semibold opacity-80">{c.sub}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-pressed={chapter === "none"}
                onClick={() => setChapter("none")}
                className="flex h-full w-full flex-col items-start gap-3 rounded-[4px] border-2 border-dashed border-[var(--gray-200)] p-5 text-left hover:border-ink aria-pressed:border-solid aria-pressed:border-ink"
              >
                <span className="text-[17px] font-semibold">I&apos;m not in a chapter</span>
                <span className="muted text-[14px]">You can still buy and sell. Your sales just don&apos;t count toward a chapter.</span>
              </button>
            </li>
          </ul>
          {chapter && chapter !== "none" && (
            <div className="mt-8 max-w-[460px]">
              <label htmlFor="join" className="text-[14px] font-semibold">
                Join code (optional)
              </label>
              <input
                id="join"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="From your officers"
                className="mt-2 h-12 w-full rounded-full border-2 border-ink px-5 text-[16px] font-semibold uppercase outline-none placeholder:normal-case placeholder:font-normal placeholder:text-[var(--gray-600)] focus:border-[var(--campus-line)]"
              />
              <p className="muted mt-2 text-[14px]">With the code you skip the gate: your chapter closet and its drops unlock right away.</p>
            </div>
          )}
          <button type="button" className="pill pill-ink mt-10" disabled={!chapter} onClick={() => setStep(2)}>
            Continue <Arrow width={18} height={18} />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">Your sizes.</h1>
          <p className="muted mt-4 max-w-[56ch] text-[17px] leading-relaxed">We use these for &quot;My sizes&quot; in search, so the feed shows what fits first.</p>
          <div className="mt-8 grid gap-6">
            {Object.entries(SIZES).map(([group, list]) => (
              <fieldset key={group}>
                <legend className="mb-3 text-[15px] font-semibold">{group}</legend>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => {
                    const key = `${group}:${s}`;
                    return (
                      <button key={key} type="button" aria-pressed={sizes.includes(key)} onClick={() => toggle(key)} className="chip min-w-14 justify-center">
                        {s}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" className="pill pill-ink" onClick={() => setStep(3)}>
              {sizes.length ? "Save my sizes" : "Skip for now"} <Arrow width={18} height={18} />
            </button>
            <button type="button" className="pill pill-line" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="display mt-3 text-[clamp(3rem,6vw,5rem)]">You&apos;re 1 of 1.</h1>
          <ul className="mt-6 grid max-w-[560px] gap-3 text-[17px]">
            <li className="flex items-center gap-3">
              <Check width={20} height={20} strokeWidth={2.5} className="text-[var(--campus-line)]" /> {campus} verified
            </li>
            <li className="flex items-center gap-3">
              <Check width={20} height={20} strokeWidth={2.5} className="text-[var(--campus-line)]" />
              {picked ? `${picked.name}${code ? ", closet unlocked" : ""}` : "No chapter for now"}
            </li>
            <li className="flex items-center gap-3">
              <Check width={20} height={20} strokeWidth={2.5} className="text-[var(--campus-line)]" />
              {sizes.length ? `Sizes: ${sizes.map((s) => s.split(":")[1]).join(", ")}` : "Sizes: add them any time"}
            </li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={feedHref} className="pill pill-ink">
              Go to the feed <Arrow width={18} height={18} />
            </Link>
            <Link href={closetHref} className="pill pill-line">
              Post your first piece
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
