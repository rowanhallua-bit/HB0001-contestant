// Closet Cup: Depop's Inbox tab becomes the leaderboard. Campus view, and the SEC view
// (one national org across every campus, each bar in its own campus color).
import Link from "next/link";
import { getChapters, getCup, getViewer } from "@/lib/data";
import { withLab } from "@/lib/lab";
import { cupDay } from "@/lib/format";
import { chapterName, one, setup } from "@/lib/page";
import { Shell } from "@/components/shell";
import { CupBars } from "@/components/cup";

export default async function CupPage({ searchParams }: PageProps<"/cup">) {
  const { params, lab, campuses, campus, cid, now } = await setup(searchParams);
  const scope = one(params.scope) === "sec" ? "sec" : "campus";
  const viewer = campus ? await getViewer(cid) : null;
  const chapters = await getChapters(cid);
  const mine = chapters.find((c) => c.id === viewer?.chapter_id) ?? chapters[0];
  const zero = lab.state === "empty";
  const rows = (scope === "sec" ? await getCup("sec", mine.national_org) : await getCup(cid)).map((r) => (zero ? { ...r, points: 0, sales_count: 0 } : r));

  return (
    <Shell lab={lab} campus={campus} campuses={campuses} nav="cup">
      <section data-ground="dark" className="ink-band bg-ink text-paper">
        <div className="column py-12 md:py-16">
          <span className="stamp">
            <span className="stamp-dot" /> Fall Cup · day {zero ? 1 : cupDay(now)}
          </span>
          <h1 className="display mt-6 text-[clamp(3.5rem,8vw,7rem)]">The Closet Cup.</h1>
          <p className="muted mt-4 max-w-[52ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed">
            Every completed sale is 10 points for the seller&apos;s chapter. The Fall Cup runs from Bid Day to the last home game.
          </p>
          <div className="mt-8 inline-flex rounded-full border border-[var(--gray-800)] p-1.5" role="tablist">
            {[
              ["campus", campus ? campus.name : "Campus"],
              ["sec", "SEC"],
            ].map(([id, label]) => (
              <Link
                key={id}
                role="tab"
                aria-selected={scope === id}
                href={withLab("/cup", lab, { scope: id === "sec" ? "sec" : null })}
                className="rounded-full px-5 py-2.5 text-[15px] font-semibold text-[var(--dim)] aria-selected:bg-paper aria-selected:text-ink"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="tape" aria-hidden="true" />
      </section>
      <div className="column pt-10 pb-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(2.25rem,4vw,3.25rem)]">
            {scope === "sec" ? `${chapterName(mine, lab)} across the SEC.` : campus ? `${campus.name} chapters.` : "Chapters."}
          </h2>
          <p className="muted text-[15px]">
            <span className="series-2-label">Points this season</span>
            <span className="hidden [[data-duo=pair]_&]:inline"> · thin bar is last season</span>
          </p>
        </div>
        {zero && (
          <p className="mb-8 border-t-2 border-ink pt-6 text-[clamp(18px,1.8vw,22px)] font-semibold">
            The Fall Cup starts with the first sale. Every chapter is at zero, so the first piece sold puts its chapter on top.
          </p>
        )}
        <CupBars rows={rows} lab={lab} mine={viewer?.chapter_id} scope={scope} />
      </div>
    </Shell>
  );
}
