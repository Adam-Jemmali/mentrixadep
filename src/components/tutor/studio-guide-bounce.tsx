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
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function StudioGuideBounce() {
  const boxRef = useRef<HTMLDivElement>(null);
  const iconARef = useRef<HTMLDivElement>(null);
  const iconBRef = useRef<HTMLDivElement>(null);
  const iconCRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const iconA = iconARef.current;
    const iconB = iconBRef.current;
    const iconC = iconCRef.current;
    if (!box || !iconA || !iconB || !iconC) return;

    const states: SpriteState[] = [
      {
        x: 16,
        y: 10,
        vx: randomBetween(1.2, 1.9),
        vy: randomBetween(0.9, 1.6),
        angle: randomBetween(0, 360),
        vr: randomBetween(0.8, 1.7),
        size: 48,
      },
      {
        x: 110,
        y: 40,
        vx: -randomBetween(1.0, 1.7),
        vy: randomBetween(0.9, 1.5),
        angle: randomBetween(0, 360),
        vr: -randomBetween(0.7, 1.4),
        size: 40,
      },
      {
        x: 220,
        y: 18,
        vx: randomBetween(0.8, 1.5),
        vy: -randomBetween(0.8, 1.4),
        angle: randomBetween(0, 360),
        vr: randomBetween(0.6, 1.3),
        size: 32,
      },
    ];

    const nodes = [iconA, iconB, iconC];
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
      <div ref={iconARef} className="absolute left-0 top-0 will-change-transform opacity-40">
        <Image src="/icons/guide.svg" alt="" width={48} height={48} />
      </div>
      <div ref={iconBRef} className="absolute left-0 top-0 will-change-transform opacity-30">
        <Image src="/icons/guide.svg" alt="" width={40} height={40} />
      </div>
      <div ref={iconCRef} className="absolute left-0 top-0 will-change-transform opacity-20">
        <Image src="/icons/guide.svg" alt="" width={32} height={32} />
      </div>
    </div>
  );
}
