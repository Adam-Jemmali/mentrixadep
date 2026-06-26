"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

type SpriteState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vr: number;
  size: number;
  role: "mentrixer" | "guide";
  opacity: number;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const SPRITE_BLUEPRINTS: Array<{
  role: "mentrixer" | "guide";
  size: number;
  opacity: number;
}> = [
  { role: "mentrixer", size: 44, opacity: 0.85 },
  { role: "guide", size: 40, opacity: 0.8 },
  { role: "mentrixer", size: 36, opacity: 0.7 },
  { role: "guide", size: 32, opacity: 0.65 },
  { role: "mentrixer", size: 28, opacity: 0.6 },
  { role: "guide", size: 24, opacity: 0.55 },
];

function buildSprites(): SpriteState[] {
  return SPRITE_BLUEPRINTS.map((sprite, index) => ({
    ...sprite,
    x: 16 + index * 48,
    y: 12 + (index % 3) * 36,
    vx: index % 2 === 0 ? randomBetween(1.0, 1.9) : -randomBetween(0.9, 1.7),
    vy: index % 3 === 0 ? -randomBetween(0.7, 1.4) : randomBetween(0.8, 1.6),
    angle: randomBetween(0, 360),
    vr: index % 2 === 0 ? randomBetween(0.6, 1.7) : -randomBetween(0.5, 1.4),
  }));
}

/** Same bounce loop as student dashboard `HeroMentrixerBounce`, with Mentrixer + Guide icons. */
export function GuestTryRoleBounce() {
  const boxRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const box = boxRef.current;
    const nodes = iconRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!box || nodes.length === 0) return;

    const states = buildSprites();

    let raf = 0;

    const tick = () => {
      const boxW = box.clientWidth;
      const boxH = box.clientHeight;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const s = states[i];
        if (!node || !s) continue;

        const maxX = Math.max(0, boxW - s.size);
        const maxY = Math.max(0, boxH - s.size);

        s.x += s.vx;
        s.y += s.vy;
        s.angle += s.vr;

        if (s.x <= 0) {
          s.x = 0;
          s.vx = Math.abs(s.vx);
          s.vr = -s.vr;
        } else if (s.x >= maxX) {
          s.x = maxX;
          s.vx = -Math.abs(s.vx);
          s.vr = -s.vr;
        }

        if (s.y <= 0) {
          s.y = 0;
          s.vy = Math.abs(s.vy);
          s.vr = -s.vr;
        } else if (s.y >= maxY) {
          s.y = maxY;
          s.vy = -Math.abs(s.vy);
          s.vr = -s.vr;
        }

        node.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.angle}deg)`;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SPRITE_BLUEPRINTS.map((sprite, index) => (
        <div
          key={`${sprite.role}-${index}`}
          ref={(el) => {
            iconRefs.current[index] = el;
          }}
          className="absolute left-0 top-0 will-change-transform"
          style={{ opacity: sprite.opacity }}
        >
          <Image
            src={sprite.role === "mentrixer" ? "/icons/mentrixer.svg" : "/icons/guide.svg"}
            alt=""
            width={sprite.size}
            height={sprite.size}
            priority={index < 2}
            className="object-contain"
            style={{ width: sprite.size, height: sprite.size }}
          />
        </div>
      ))}
    </div>
  );
}
