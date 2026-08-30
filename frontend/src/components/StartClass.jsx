import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Play, PlayCircle, ChevronRight, Clock } from "lucide-react";
import { listSessions } from "../lib/api";
import { formatDuration } from "../lib/format";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#3b5bc4] focus:ring-2 focus:ring-[#3b5bc4]/15";

const dateLabel = (iso) => {
  try {
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

export const StartClass = ({
  title,
  subject,
  onTitleChange,
  onSubjectChange,
  onJoinReal,
  onJoinDemo,
  onReplay,
  onOpenSession,
  loading,
  refreshKey,
}) => {
  const [sessions, setSessions] = useState([]);

  const load = useCallback(() => {
    listSessions()
      .then((s) => setSessions(s || []))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-testid="screen-start-class"
    >
      <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-[#6b7fb3]">
        WELCOME TO CLASSOS
      </p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
        Set up your class
      </h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Add a title and subject if you like — both are optional. Then start recording.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label htmlFor="class-title" className="mb-1.5 block text-[13px] font-medium text-slate-600">
            Class title <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="class-title"
            data-testid="class-title-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Morning lecture"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="class-subject" className="mb-1.5 block text-[13px] font-medium text-slate-600">
            Subject <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="class-subject"
            data-testid="class-subject-input"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="e.g. Economics"
            className={inputClass}
          />
        </div>
      </div>

      <button
        onClick={onJoinReal}
        disabled={loading}
        data-testid="start-live-class-btn"
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1e3a8a] py-4 text-[15px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
      >
        <Mic className="h-[18px] w-[18px]" strokeWidth={2.2} />
        Start Live Class
      </button>

      <button
        onClick={onJoinDemo}
        disabled={loading}
        data-testid="try-demo-btn"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-[14px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        <Play className="h-[13px] w-[13px] fill-current" />
        Try Simulated Demo
      </button>

      {sessions.length > 0 && (
        <div className="mt-8" data-testid="your-classes">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Your classes
          </p>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                data-testid="session-row"
                className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
              >
                <button
                  onClick={() => onOpenSession(s)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  data-testid="open-session-btn"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-slate-800">
                      {s.title || "Untitled class"}
                    </p>
                    <p className="truncate text-[12px] text-slate-400">
                      {s.subject || "No subject"} · {dateLabel(s.created_at)} ·{" "}
                      {formatDuration(s.duration_seconds)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
                <button
                  onClick={() => onReplay(s)}
                  disabled={loading}
                  data-testid="replay-session-btn"
                  title="Replay a saved class"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[#eef3fb] px-3 py-1.5 text-[12px] font-medium text-[#2f49a3] hover:bg-[#dce6fa] disabled:opacity-60"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Replay
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" /> Replays play a saved transcript at 4× — a safe fallback if a live connection drops.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-[12px] text-slate-400" data-testid="phase-note">
        No account needed — your classes stay on this device.
      </p>
    </motion.div>
  );
};
