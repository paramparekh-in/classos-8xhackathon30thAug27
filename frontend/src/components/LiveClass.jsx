import { useEffect, useRef, useState } from "react";
import { postTranscriptChunk } from "../lib/api";
import { useCatchMeUp } from "../hooks/useCatchMeUp";
import { demoLecture } from "../data/demoLecture";
import { LiveSessionView } from "./LiveSessionView";

// Demo & Replay both feed the SAME transcript + Catch Me Up pipeline as the
// real flow. Demo plays a scripted lecture at ~realtime; Replay plays a stored
// transcript at 4x. Nothing here is special-cased downstream.
export const LiveClass = ({ session, elapsed, onEnd, script }) => {
  const [committed, setCommitted] = useState([]);
  const catchup = useCatchMeUp(session.id, true);

  const idxRef = useRef(0);
  const startRef = useRef(0);
  const wordsRef = useRef(0);

  const lecture = script && script.length ? script : demoLecture;
  const speed = session.mode === "replay" ? 4 : 1;

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      const scaled = ((Date.now() - startRef.current) / 1000) * speed;
      while (idxRef.current < lecture.length && lecture[idxRef.current].t <= scaled) {
        const e = lecture[idxRef.current];
        const seq = idxRef.current;
        const at = Math.round(e.t);
        setCommitted((prev) => [...prev, { seq, text: e.text }]);
        wordsRef.current += e.text.split(/\s+/).length;
        catchup.notifyWords(wordsRef.current);
        postTranscriptChunk(session.id, {
          seq,
          text: e.text,
          timestamp: new Date().toISOString(),
          at_seconds: at,
        }).catch(() => {});
        idxRef.current += 1;
      }
      if (idxRef.current >= lecture.length) clearInterval(id);
    }, 300);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LiveSessionView
      mode={session.mode}
      title={session.title}
      subject={session.subject}
      elapsed={elapsed}
      connectionState="listening"
      committed={committed}
      partial=""
      catchup={catchup}
      onEnd={onEnd}
    />
  );
};
