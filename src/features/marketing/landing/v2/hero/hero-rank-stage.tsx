"use client";

import Image from "next/image";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_HERO } from "@/features/marketing/landing/landing-copy-pure";
import { ACCOUNT_RANK_VISUALS } from "@/features/xp/rank-icons";

const ICON_VERSION = "20260410";

/**
 * Static hero visual — one Mentrixa logo + rank marks.
 * No orbit game, no continuous spin, no NumberFlow (low-end / no-GPU safe).
 */
export function HeroRankStage() {
  const ranks = ACCOUNT_RANK_VISUALS.slice(0, 5);

  return (
    <div className="flex w-full max-w-[22rem] flex-col items-center gap-5 px-2 py-4 sm:max-w-[24rem]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src={MENTRIXA_LOGO_PNG}
          alt="Mentrixa"
          width={80}
          height={80}
          priority
          className="select-none object-contain"
          draggable={false}
        />
        <p className={`max-w-[16rem] ${landingHub.bodySm}`}>{LANDING_HERO.footnote}</p>
      </div>

      <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Mentrixer ranks">
        {ranks.map((rank) => (
          <li
            key={rank.key}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C4B5FD] bg-[#F5F3FF]"
            title={rank.title}
          >
            <Image
              src={`${rank.iconSrc}?v=${ICON_VERSION}`}
              alt=""
              width={28}
              height={28}
              className="object-contain"
              draggable={false}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
