"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeCognitiveFrictionScore,
  computeKeystrokeFlightVariance,
  isFrictionAnomaly,
  KEYSTROKE_POOL_SIZE,
  MAX_MEANINGFUL_FLIGHT_MS,
} from "@/features/analytics/utils/biometric-friction";

export type BiometricTelemetrySnapshot = {
  keystrokeVariance: number;
  tabFocusLeaks: number;
  frictionScore: number;
  isAnomalyDetected: boolean;
};

export function useBiometricTelemetry(enabled: boolean): BiometricTelemetrySnapshot {
  const [keystrokeVariance, setKeystrokeVariance] = useState(0);
  const [tabFocusLeaks, setTabFocusLeaks] = useState(0);
  const [keystrokeSampleCount, setKeystrokeSampleCount] = useState(0);

  const flightTimesRef = useRef<number[]>([]);
  const lastKeydownRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      flightTimesRef.current = [];
      lastKeydownRef.current = null;
      setKeystrokeVariance(0);
      setTabFocusLeaks(0);
      setKeystrokeSampleCount(0);
      return;
    }

    const onKeydown = () => {
      const now = performance.now();
      if (lastKeydownRef.current != null) {
        const flight = now - lastKeydownRef.current;
        if (flight > 0 && flight < MAX_MEANINGFUL_FLIGHT_MS) {
          const pool = [...flightTimesRef.current, flight].slice(-KEYSTROKE_POOL_SIZE);
          flightTimesRef.current = pool;
          setKeystrokeSampleCount(pool.length);
          setKeystrokeVariance(computeKeystrokeFlightVariance(pool));
        }
      }
      lastKeydownRef.current = now;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        setTabFocusLeaks((count) => count + 1);
      }
    };

    window.addEventListener("keydown", onKeydown);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  const frictionScore = useMemo(
    () => computeCognitiveFrictionScore(tabFocusLeaks, keystrokeVariance, keystrokeSampleCount),
    [tabFocusLeaks, keystrokeVariance, keystrokeSampleCount]
  );

  const isAnomalyDetected = useMemo(() => isFrictionAnomaly(frictionScore), [frictionScore]);

  return {
    keystrokeVariance,
    tabFocusLeaks,
    frictionScore,
    isAnomalyDetected,
  };
}
