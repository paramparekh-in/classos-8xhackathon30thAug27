import { useCallback, useEffect, useRef, useState } from "react";
import { getCatchup, expandCatchup } from "../lib/api";

// Real, automatic Catch Me Up: fires every 20s but only when >=40 new words
// have been committed since the last call. Single in-flight, keeps last good.
export const useCatchMeUp = (sessionId, enabled) => {
  const [data, setData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandBullets, setExpandBullets] = useState(null);
  const [loadingExpand, setLoadingExpand] = useState(false);

  const totalWordsRef = useRef(0);
  const wordsAtLastCallRef = useRef(0);
  const inFlightRef = useRef(false);
  const hasDataRef = useRef(false);
  const kickRef = useRef(0);

  const notifyWords = useCallback((count) => {
    totalWordsRef.current = count;
  }, []);

  const fetchNow = useCallback(async () => {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await getCatchup(sessionId);
      wordsAtLastCallRef.current = totalWordsRef.current;
      if (res && (res.right_now || (res.terms && res.terms.length))) {
        setData(res);
        setUpdatedAt(Date.now());
        hasDataRef.current = true;
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
      }
    } catch {
      /* keep last good silently */
    } finally {
      inFlightRef.current = false;
    }
  }, [sessionId]);

  const forceRefresh = useCallback(() => {
    fetchNow();
  }, [fetchNow]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const tick = () => {
      const total = totalWordsRef.current;
      const since = total - wordsAtLastCallRef.current;
      if (since >= 40 || (!hasDataRef.current && total >= 18)) {
        fetchNow();
      }
    };
    const id = setInterval(tick, 20000);
    // Also probe a bit sooner so the first result appears without a full 20s wait.
    const kick = setInterval(() => {
      if (!hasDataRef.current && totalWordsRef.current >= 18 && kickRef.current < 6) {
        kickRef.current += 1;
        fetchNow();
      }
    }, 6000);
    return () => {
      clearInterval(id);
      clearInterval(kick);
    };
  }, [enabled, sessionId, fetchNow]);

  const toggleExpand = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && sessionId) {
      setLoadingExpand(true);
      try {
        const res = await expandCatchup(sessionId);
        setExpandBullets(res.bullets || []);
      } catch {
        setExpandBullets([]);
      } finally {
        setLoadingExpand(false);
      }
    }
  }, [expanded, sessionId]);

  return {
    data,
    updatedAt,
    pulse,
    expanded,
    expandBullets,
    loadingExpand,
    notifyWords,
    forceRefresh,
    toggleExpand,
  };
};
