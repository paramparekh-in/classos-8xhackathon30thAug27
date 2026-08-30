import { useCallback, useEffect, useRef, useState } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { getScribeToken, postTranscriptChunk, flagMoment } from "../lib/api";
import { useCatchMeUp } from "../hooks/useCatchMeUp";
import { LiveSessionView } from "./LiveSessionView";

export const LiveClassReal = ({ session, elapsed, onEnd }) => {
  const [committed, setCommitted] = useState([]);
  const [partial, setPartial] = useState("");
  const [fatal, setFatal] = useState(null);
  const [ending, setEnding] = useState(false);

  const seqRef = useRef(0);
  const wordsRef = useRef(0);
  const startedRef = useRef(false);
  const hadConnectedRef = useRef(false);
  const partialRef = useRef("");
  const scribeRef = useRef(null);
  const elapsedRef = useRef(0);

  const catchup = useCatchMeUp(session.id, true);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const handleCommitted = useCallback(
    (text) => {
      const t = (text || "").trim();
      if (!t) return;
      const seq = seqRef.current;
      seqRef.current += 1;
      setCommitted((prev) => [...prev, { seq, text: t }]);
      setPartial("");
      partialRef.current = "";
      wordsRef.current += t.split(/\s+/).length;
      catchup.notifyWords(wordsRef.current);
      postTranscriptChunk(session.id, {
        seq,
        text: t,
        timestamp: new Date().toISOString(),
        at_seconds: Math.round(elapsedRef.current),
      }).catch(() => {});
    },
    [session.id, catchup]
  );

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    includeLanguageDetection: true,
    microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    onPartialTranscript: (data) => {
      const txt = data?.text || "";
      partialRef.current = txt;
      setPartial(txt);
    },
    onCommittedTranscript: (data) => handleCommitted(data?.text || ""),
    onAuthError: () => setFatal("auth"),
    onError: () => setFatal("error"),
  });

  const connectScribe = useCallback(async () => {
    setFatal(null);
    try {
      const token = await getScribeToken(session.id);
      await scribe.connect({ token });
    } catch (e) {
      setFatal(e?.response?.data?.detail || e?.message || "unavailable");
    }
  }, [session.id, scribe]);

  useEffect(() => {
    scribeRef.current = scribe;
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    connectScribe();
    return () => {
      try {
        scribeRef.current?.disconnect();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track reconnects: fire Catch Me Up immediately when we reconnect.
  const prevStatusRef = useRef(null);
  useEffect(() => {
    const s = scribe.status;
    if (s === "connected" || s === "transcribing") {
      if (hadConnectedRef.current && prevStatusRef.current === "connecting") {
        catchup.forceRefresh();
      }
      hadConnectedRef.current = true;
    }
    prevStatusRef.current = s;
  }, [scribe.status, catchup]);

  let connectionState;
  if (fatal || scribe.status === "error") connectionState = "unavailable";
  else if (scribe.status === "connected" || scribe.status === "transcribing")
    connectionState = "listening";
  else connectionState = hadConnectedRef.current ? "reconnecting" : "connecting";

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    const pending = partialRef.current.trim();
    try {
      scribe.commit();
    } catch {
      /* noop */
    }
    await new Promise((r) => setTimeout(r, 1600));
    if (pending && partialRef.current.trim() === pending) {
      handleCommitted(pending);
      await new Promise((r) => setTimeout(r, 200));
    }
    try {
      scribe.disconnect();
    } catch {
      /* noop */
    }
    onEnd();
  };

  return (
    <LiveSessionView
      mode="real"
      title={session.title}
      subject={session.subject}
      elapsed={elapsed}
      connectionState={connectionState}
      committed={committed}
      partial={partial}
      catchup={catchup}
      onEnd={handleEnd}
      onRetry={connectScribe}
      onFlag={() => flagMoment(session.id, Math.round(elapsedRef.current)).catch(() => {})}
    />
  );
};
