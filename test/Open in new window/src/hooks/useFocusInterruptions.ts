import { useEffect, useRef, useState } from "react";

type FocusReport = {
  count: number;
  interrupted: boolean;
  awayMs: number;
};

/**
 * Tracks how many times a window loses tab focus.
 *
 * A blur and the visibility change that follows it are collapsed into a single
 * interruption, so switching away once only ever counts once. The counter is
 * tied to whichever window the quiz is running in, which makes it work both in
 * the main tab and inside a separate quiz window.
 */
export function useFocusInterruptions(target: Window | null, enabled = true): FocusReport {
  const [count, setCount] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const [awayMs, setAwayMs] = useState(0);

  const isOpenRef = useRef(false);
  const awayStartRef = useRef(0);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!target || !enabled) return;

    const doc = target.document;
    let timer = 0;

    const markAway = () => {
      if (isOpenRef.current) return;
      isOpenRef.current = true;
      awayStartRef.current = Date.now();
      setInterrupted(true);
      setCount((value) => value + 1);
    };

    const markReturn = () => {
      if (doc.visibilityState !== "visible") return;
      if (!isOpenRef.current) return;
      isOpenRef.current = false;
      if (awayStartRef.current) {
        accumulatedRef.current += Date.now() - awayStartRef.current;
        awayStartRef.current = 0;
        setAwayMs(accumulatedRef.current);
      }
      setInterrupted(false);
    };

    const handleVisibility = () => {
      if (doc.visibilityState === "hidden") {
        markAway();
      } else {
        markReturn();
      }
    };

    // The page may already be out of focus when tracking starts.
    if (doc.visibilityState !== "visible") {
      isOpenRef.current = true;
      awayStartRef.current = Date.now();
      setInterrupted(true);
    }

    target.addEventListener("blur", markAway);
    target.addEventListener("focus", markReturn);
    doc.addEventListener("visibilitychange", handleVisibility);

    timer = target.setInterval(() => {
      if (!isOpenRef.current || !awayStartRef.current) return;
      setAwayMs(accumulatedRef.current + (Date.now() - awayStartRef.current));
    }, 250);

    return () => {
      target.clearInterval(timer);
      target.removeEventListener("blur", markAway);
      target.removeEventListener("focus", markReturn);
      doc.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [target, enabled]);

  return { count, interrupted, awayMs };
}
