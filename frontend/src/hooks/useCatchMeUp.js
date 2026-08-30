import { useCallback, useEffect, useRef, useState } from "react";
import { getCatchup, expandCatchup } from "../lib/api";

// Real, automatic Catch Me Up. Fires on a reliable 20s tick, kept fresh so the
// label never drifts past ~40s. Single in-flight, keeps last good text.
export const useCatchMeUp = (sessionId, enabled) => {
  const [data, setData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandBullets, setExpandBullets] = useState(null);
  const [expandAt, setExpandAt] = useState(null);
  const [loadingExpand, setLoadingExpand] = useState(false);

  const totalWordsRef = useRef(0);
  const wordsAtLastCallRef = useRef(0);
  const inFlightRef = useRef(false);
  const hasDataRef = useRef(false);
  const kickRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const expandedRef = useRef(false);

  const notifyWords = useCallback((count) => {
    totalWordsRef.current = count;
  }, []);

  const doExpand = useCallback(async () => {
    if (!sessionId) return;
    setLoadingExpand(true);
    try {
      const res = await expandCatchup(sessionId);
      setExpandBullets(res.bullets || []);
      setExpandAt(Date.now());
    } catch {
      setExpandBullets([]);
    } finally {
      setLoadingExpand(false);
    }
  }, [sessionId]);

  const fetchNow = useCallback(async () => {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    setUpdating(true);
    try {
      const res = await getCatchup(sessionId);
      wordsAtLastCallRef.current = totalWordsRef.current;
      if (res && (res.right_now || (res.terms && res.terms.length))) {
        setData(res);
        setUpdatedAt(Date.now());
        lastUpdateRef.current = Date.now();
        hasDataRef.current = true;
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
        if (expandedRef.current) doExpand();
      }
    } catch {
      /* keep last good silently */
    } finally {
      inFlightRef.current = false;
      setUpdating(false);
    }
  }, [sessionId, doExpand]);

  const forceRefresh = useCallback(() => {
    fetchNow();
  }, [fetchNow]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const tick = () => {
      const total = totalWordsRef.current;
      const since = total - wordsAtLastCallRef.current;
      const staleMs = Date.now() - (lastUpdateRef.current || 0);
      if (
        since >= 40 ||
        (since > 0 && staleMs >= 40000) ||
        (!hasDataRef.current && total >= 18 && kickRef.current < 6)
      ) {
        if (!hasDataRef.current) kickRef.current += 1;
        fetchNow();
      }
    };
    const id = setInterval(tick, 20000);
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
    expandedRef.current = next;
    if (next) doExpand();
  }, [expanded, doExpand]);

  return {
    data,
    updatedAt,
    updating,
    pulse,
    expanded,
    expandBullets,
    expandAt,
    loadingExpand,
    notifyWords,
    forceRefresh,
    toggleExpand,
  };
};
