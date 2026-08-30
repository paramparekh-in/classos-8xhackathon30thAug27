import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Mic, Square, Sparkles, FileText, RotateCw, Loader2 } from "lucide-react";
import { formatDuration } from "../lib/format";
import { getScribeToken, postTranscriptChunk } from "../lib/api";

const STATUS_META = {
  connecting: { label: "Connecting to transcription…", dot: "bg-amber-400", text: "text-amber-200" },
  listening: { label: "Listening · microphone active", dot: "bg-emerald-400", text: "text-emerald-200" },
  reconnecting: { label: "Reconnecting…", dot: "bg-amber-400", text: "text-amber-200" },
  unavailable: { label: "Transcription unavailable", dot: "bg-red-400", text: "text-red-200" },
};

export const LiveClassReal = ({ session, elapsed, onEnd }) => {
  const [committed, setCommitted] = useState([]);
  const [partial, setPartial] = useState("");
  const [fatal, setFatal] = useState(null);
  const [ending, setEnding] = useState(false);

  const seqRef = useRef(0);
  const startedRef = useRef(false);
  const hadConnectedRef = useRef(false);
  const scrollRef = useRef(null);
  const partialRef = useRef("");
  const scribeRef = useRef(null);

  const handleCommitted = useCallback(
    (text) => {
      const t = (text || "").trim();
      if (!t) return;
      const seq = seqRef.current;
      seqRef.current += 1;
      const ts = new Date().toISOString();
      setCommitted((prev) => [...prev, { seq, text: t, ts }]);
      setPartial("");
      partialRef.current = "";
      postTranscriptChunk(session.id, { seq, text: t, timestamp: ts }).catch(() => {});
    },
    [session.id]
  );

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    includeLanguageDetection: true,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    onPartialTranscript: (data) => {
      const txt = data?.text || "";
      partialRef.current = txt;
      setPartial(txt);
    },
    onCommittedTranscript: (data) => handleCommitted(data?.text || ""),
    onAuthError: () => setFatal("Transcription authorization failed."),
    onError: () => setFatal("Transcription connection error."),
  });

  const connectScribe = useCallback(async () => {
    setFatal(null);
    try {
      const token = await getScribeToken(session.id);
      await scribe.connect({ token });
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Transcription unavailable.";
      setFatal(msg);
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

  useEffect(() => {
    if (scribe.status === "connected" || scribe.status === "transcribing") {
      hadConnectedRef.current = true;
    }
  }, [scribe.status]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [committed, partial]);

  const handleRetry = () => {
    startedRef.current = true;
    hadConnectedRef.current = false;
    connectScribe();
  };

  const handleEndClick = async () => {
    if (ending) return;
    setEnding(true);
    const pending = partialRef.current.trim();
    // Ask ElevenLabs to commit any buffered speech before we disconnect.
    try {
      scribe.commit();
    } catch {
      /* noop */
    }
    await new Promise((r) => setTimeout(r, 1600));
    // Fallback: if the pending partial was never committed, persist it so
    // trailing speech is not lost. Session is still 'live' at this point.
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

  let display;
  if (fatal || scribe.status === "error") display = "unavailable";
  else if (scribe.status === "connected" || scribe.status === "transcribing")
    display = "listening";
  else if (scribe.status === "connecting")
    display = hadConnectedRef.current ? "reconnecting" : "connecting";
  else display = hadConnectedRef.current ? "reconnecting" : "connecting";

  const meta = STATUS_META[display];
  const hasContent = committed.length > 0 || partial;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-1 flex-col"
      data-testid="screen-live-class"
    >
      <div className="mt-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span
          className="text-[11px] font-semibold tracking-[0.14em] text-red-500"
          data-testid="live-status"
        >
          LIVE
        </span>
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-3xl p-6 text-center text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #172554 0%, #1e3a8a 55%, #2f49a3 100%)",
        }}
      >
        <p className="text-[13px] font-medium text-white/60">
          {session?.subject || "No subject"}
        </p>
        <p className="text-lg font-semibold" data-testid="live-title">
          {session?.title || "Untitled class"}
        </p>

        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <Mic className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
        </motion.div>

        <p
          className="mt-5 font-mono text-5xl font-semibold tabular-nums tracking-tight"
          data-testid="live-timer"
        >
          {formatDuration(elapsed)}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          <span className={`text-[13px] ${meta.text}`} data-testid="connection-status">
            {meta.label}
          </span>
        </div>

        {display === "unavailable" && (
          <button
            onClick={handleRetry}
            data-testid="retry-btn"
            className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/25"
          >
            <RotateCw className="h-3.5 w-3.5" strokeWidth={2.2} />
            Retry
          </button>
        )}
      </div>

      <div
        className="mt-4 flex min-h-[140px] flex-1 flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5"
        data-testid="transcript-area"
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-slate-500">
          <FileText className="h-4 w-4 text-slate-400" strokeWidth={2} />
          TRANSCRIPT
        </div>

        <div
          ref={scrollRef}
          className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        >
          {!hasContent && (
            <p
              className="py-6 text-center text-[14px] text-slate-400"
              data-testid="transcript-placeholder"
            >
              {display === "unavailable"
                ? "Transcription is unavailable."
                : display === "listening"
                ? "Listening… start speaking."
                : "Live transcription will appear here"}
            </p>
          )}

          {committed.map((c) => (
            <p
              key={c.seq}
              className="text-[15px] leading-relaxed text-slate-800"
              data-testid="transcript-committed"
            >
              {c.text}
            </p>
          ))}

          {partial && (
            <p
              className="flex items-start gap-2 text-[15px] italic leading-relaxed text-slate-400"
              data-testid="transcript-partial"
            >
              <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-[#3b5bc4]" />
              <span>{partial}</span>
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-3 flex items-start gap-3 rounded-3xl bg-[#eef3fb] p-4 ring-1 ring-[#3b5bc4]/10"
        data-testid="catch-me-up-card"
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#3b5bc4]/10">
          <Sparkles className="h-4 w-4 text-[#3b5bc4]" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-800">Catch Me Up</p>
          <p className="text-[13px] text-slate-500" data-testid="catch-me-up-status">
            Listening for enough context…
          </p>
        </div>
      </div>

      <button
        onClick={handleEndClick}
        disabled={ending}
        data-testid="end-class-btn"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-[15px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
      >
        <Square className="h-4 w-4 fill-current" />
        {ending ? "Ending…" : "End Class"}
      </button>
    </motion.div>
  );
};
