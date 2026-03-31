import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const revealUp = (targets: gsap.DOMTarget, stagger?: number) =>
  gsap.fromTo(
    targets,
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, stagger: stagger ?? 0.06, duration: 0.6, ease: "power3.out" },
  );

export const countUp = (el: HTMLElement, end: number, duration?: number) => {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration: duration ?? 1.2,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = Math.round(obj.val).toLocaleString();
    },
  });
};

export const revealLine = (target: gsap.DOMTarget) =>
  gsap.fromTo(
    target,
    { scaleX: 0 },
    { scaleX: 1, duration: 0.8, ease: "power4.out", transformOrigin: "left" },
  );

export const staggerIn = (targets: gsap.DOMTarget) =>
  gsap.fromTo(
    targets,
    { y: 8, opacity: 0 },
    { y: 0, opacity: 1, stagger: 0.04, duration: 0.35, ease: "power2.out" },
  );

