"use client";
// Sealed-bid drops: one hidden bid per member, raisable until close. Top N bids win.
// rule=uniform: every winner pays the lowest winning bid. rule=first: each winner pays their own bid.
// Mock: the bid lives in local state; the lab's `bid` switch shows each outcome.
import Link from "next/link";
import { useState } from "react";
import type { DropPhase } from "@/lib/types";
import { Alert, Bell, Check, Lock } from "./icons";

const dollars = (cents: number) => `$${Math.round(cents / 100)}`;

export function SealedBid({
  phase,
  pieces,
  minCents,
  bidCount,
  rule,
  state,
  myBidCents,
  result,
  chapter,
  closetHref,
}: {
  phase: DropPhase;
  pieces: number;
  minCents: number;
  bidCount: number;
  rule: "uniform" | "first";
  state: "none" | "placed" | "won" | "lost";
  myBidCents: number;
  result: { clearing: number; top: number; rank: number; pays: number };
  chapter: string;
  closetHref: string;
}) {
  const [placed, setPlaced] = useState<number | null>(state === "placed" ? myBidCents : null);
  const [value, setValue] = useState(String(Math.round(myBidCents / 100)));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);
  const ruleLine =
    rule === "uniform"
      ? `Top ${pieces} bids win, and every winner pays the same price: the lowest winning bid.`
      : `Top ${pieces} bids win, and each winner pays exactly what they bid.`;

  const submit = () => {
    const cents = Math.round(Number(value) * 100);
    if (!Number.isFinite(cents) || cents < minCents) return setError(`Bids start at ${dollars(minCents)}. Enter ${dollars(minCents)} or more.`);
    if (placed && cents <= placed) return setError(`You can only raise a sealed bid. Enter more than ${dollars(placed)}.`);
    setError(null);
    setPlaced(cents);
    setEditing(false);
  };

  const rules = (
    <ul className="field-soft mt-5 grid gap-1.5 text-[14px] font-semibold">
      <li className="flex gap-2">
        <Lock width={16} height={16} className="mt-0.5 shrink-0" /> Bids are sealed: nobody sees anyone else&apos;s bid, not even the chapter.
      </li>
      <li className="flex gap-2">
        <Check width={16} height={16} className="mt-0.5 shrink-0" /> {ruleLine}
      </li>
      <li className="flex gap-2">
        <Check width={16} height={16} className="mt-0.5 shrink-0" /> You&apos;re only charged if you win. No buyer fee on drops.
      </li>
    </ul>
  );

  if (phase === "upcoming")
    return (
      <div>
        <p className="text-[17px] font-semibold">
          {pieces} pieces. Bids start at {dollars(minCents)}.
        </p>
        <button type="button" className="pill pill-flip mt-5" onClick={() => setReminded(true)} aria-pressed={reminded}>
          {reminded ? <Check width={18} height={18} strokeWidth={3} /> : <Bell width={18} height={18} />} {reminded ? "We'll remind you when bidding opens" : "Remind me"}
        </button>
        {rules}
      </div>
    );

  if (phase === "ended") {
    const outcome = state === "won" || state === "lost" ? state : null;
    return (
      <div role="status">
        {outcome === "won" ? (
          <div className="rounded-[4px] bg-paper p-5 text-ink">
            <p className="flex items-center gap-2 text-[18px] font-bold">
              <Check width={20} height={20} strokeWidth={3} /> You won piece #{result.rank} of {pieces}.
            </p>
            <p className="muted mt-1 text-[15px]">
              You bid {dollars(myBidCents)} and pay <b className="text-ink">{dollars(result.pays)}</b>
              {rule === "uniform" ? ", the lowest winning bid." : "."} +40 pts for {chapter} in the Fall Cup.
            </p>
          </div>
        ) : outcome === "lost" ? (
          <div className="rounded-[4px] bg-paper p-5 text-ink">
            <p className="flex items-center gap-2 text-[18px] font-bold">
              <Alert width={20} height={20} /> Your {dollars(myBidCents)} bid didn&apos;t make the top {pieces}.
            </p>
            <p className="muted mt-1 text-[15px]">The lowest winning bid was {dollars(result.clearing)}. You weren&apos;t charged.</p>
          </div>
        ) : (
          <p className="text-[17px] leading-relaxed">
            Bidding closed with {bidCount} sealed bids for {pieces} pieces. Winning bids ran from {dollars(result.clearing)} to {dollars(result.top)}.
          </p>
        )}
        <Link href={closetHref} className="pill pill-flip mt-6">
          Shop {chapter}&apos;s closet
        </Link>
      </div>
    );
  }

  return (
    <div>
      {placed && !editing ? (
        <div className="rounded-[4px] bg-[var(--campus-ink)] p-5 text-[var(--campus)]" role="status">
          <p className="flex items-center gap-2 text-[18px] font-bold">
            <Lock width={20} height={20} /> Your sealed bid: {dollars(placed)}
          </p>
          <p className="mt-1 text-[15px] font-semibold opacity-85">Hidden from everyone. You can raise it until bidding closes.</p>
          <button type="button" className="mt-4 text-[15px] font-bold underline underline-offset-4" onClick={() => setEditing(true)}>
            Raise my bid
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="bid" className="text-[14px] font-semibold">
            {placed ? `Raise your bid (now ${dollars(placed)})` : `Your sealed bid (${dollars(minCents)} minimum)`}
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <div className="flex h-[52px] items-center rounded-full border-2 border-current px-5">
              <span className="display text-[28px]">$</span>
              <input
                id="bid"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                className="display num w-24 bg-transparent pl-1 text-[28px] text-current outline-none"
                aria-describedby="bid-help"
              />
            </div>
            <button className="pill pill-flip">{placed ? "Raise sealed bid" : "Place sealed bid"}</button>
          </div>
          <p id="bid-help" className="mt-3 flex min-h-6 items-center gap-2 text-[15px] font-semibold" role="status">
            {error && (
              <>
                <Alert width={20} height={20} /> {error}
              </>
            )}
          </p>
        </form>
      )}
      {rules}
    </div>
  );
}
