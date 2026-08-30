import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Square, RotateCw, Flag } from "lucide-react";
import { formatDuration } from "../lib/format";
import { useWakeLock } from "../hooks/useWakeLock";
import { CatchMeUpCard } from "./CatchMeUpCard";
import { TranscriptList } from "./TranscriptList";

const BADGE = {
  real: { label: "LIVE", dot: "bg-red-500", ping: "bg-red-400", text: "text-red-500" },
  demo: { label: "SIMULATED DEMO", dot: "bg-amber-500", ping: "bg-amber-400", text: "text-amber-600" },
  replay: { label: "REPLAY", dot: "bg-[#3b5bc4]", ping: "bg-[#6b7fb3]", text: "text-[#2f49a3]" },
};

const CONN = {
  connecting: { label: "Connecting…", dot: "bg-amber-400" },
  listening: { label: "Listening", dot: "bg-emerald-500" },
  reconnecting: { label: "Reconnecting…", dot: "bg-amber-400" },
  unavailable: { label: "Transcription unavailable", dot: "bg-red-500" },
};

export const LiveSessionView = ({
  mode,
  title,
  subject,
  elapsed,
  connectionState,
  committed,
  partial,
  catchup,
  onEnd,
  onRetry,
  onFlag,
}) => {
  const [confirm, setConfirm] = useState(false);
  useWakeLock(true);

  const badge = BADGE[mode] || BADGE.real;
  const conn = CONN[connectionState] || CONN.connecting;

  const handleFlag = () => {
    if (onFlag) onFlag();
    toast.success("Flagged this moment");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="screen-live-class">
      {/* Header — fixed */}
      <div className="shrink-0">
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${badge.ping}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${badge.dot}`} />
            </span>
            <span className={`text-[11px] font-bold tracking-[0.14em] ${badge.text}`} data-testid="live-status">
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFlag}
              data-testid="flag-btn"
              className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
              title="Mark this moment — I'm lost"
            >
              <Flag className="h-3 w-3" /> I'm lost
            </button>
            <span className="font-mono text-[15px] font-semibold tabular-nums text-slate-700" data-testid="live-timer">
              {formatDuration(elapsed)}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-900" data-testid="live-title">
              {title || "Untitled class"}
            </p>
            <p className="truncate text-[12px] text-slate-400">{subject || "No subject"}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${conn.dot}`} />
            <span className="text-[11px] text-slate-400" data-testid="connection-status">
              {conn.label}
            </span>
          </div>
        </div>

        {connectionState === "unavailable" && onRetry && (
          <button
            onClick={onRetry}
            data-testid="retry-btn"
            className="mt-2 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-200"
          >
            <RotateCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}

        {/* Catch Me Up — the hero, never scrolls away */}
        <div className="mt-4">
          <CatchMeUpCard catchup={catchup} paused={connectionState === "unavailable"} />
        </div>
      </div>

      {/* Transcript — the ONLY scrolling region */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl bg-white/70 p-4 ring-1 ring-black/5">
        <TranscriptList committed={committed} partial={partial} />
      </div>

      {/* Footer — sticky */}
      <div className="shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button
          onClick={() => setConfirm(true)}
          data-testid="end-class-btn"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-[15px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Square className="h-4 w-4 fill-current" />
          End Class
        </button>
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            data-testid="end-confirm-overlay"
            onClick={() => setConfirm(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] rounded-3xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">End this class?</h3>
              <p className="mt-1 text-[14px] text-slate-500">
                We'll stop recording and generate your notes and quiz.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setConfirm(false)}
                  data-testid="end-cancel-btn"
                  className="flex-1 rounded-2xl bg-slate-100 py-3 text-[14px] font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Keep going
                </button>
                <button
                  onClick={() => {
                    setConfirm(false);
                    onEnd();
                  }}
                  data-testid="end-confirm-btn"
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-[14px] font-semibold text-white hover:bg-slate-800"
                >
                  End & generate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
