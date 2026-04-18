"use client";

import { useEffect, useRef } from "react";

function playClickSound(audioContext: AudioContext) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const base = 860 + Math.random() * 120;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(base, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(base * 0.78, audioContext.currentTime + 0.03);

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.045);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.05);

  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
}

function isStudentOrTutorPath(pathname: string): boolean {
  return pathname.startsWith("/student") || pathname.startsWith("/tutor");
}

function getSoundTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;

  // Explicit opt-in always wins.
  const explicit = target.closest('[data-click-sound="true"]');
  if (explicit instanceof HTMLElement) return explicit;

  // Automatic coverage for interactive controls in student/guide surfaces.
  const auto = target.closest(
    "button, a[href], [role='button'], [role='tab'], [role='menuitem'], input[type='button'], input[type='submit']",
  );
  return auto instanceof HTMLElement ? auto : null;
}

export function ClickSoundProvider() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const getAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      return audioContextRef.current;
    };

    const handleClick = (event: MouseEvent) => {
      const pathname = window.location.pathname;
      if (!isStudentOrTutorPath(pathname)) return;

      const target = getSoundTarget(event.target);
      if (!target) return;
      if (target.getAttribute("data-click-sound") === "false") return;
      if (target.getAttribute("aria-disabled") === "true" || target.hasAttribute("disabled")) return;

      const now = Date.now();
      if (now - lastPlayedAtRef.current < 28) return;
      lastPlayedAtRef.current = now;

      try {
        const audioContext = getAudioContext();
        if (audioContext.state === "suspended") {
          void audioContext.resume().catch(() => {});
        }
        playClickSound(audioContext);
      } catch {
        /* sound is best-effort */
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      void audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  return null;
}