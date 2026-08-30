import { motion } from "framer-motion";
import { Mic, Square, Sparkles, FileText } from "lucide-react";
import { formatDuration } from "../lib/format";

export const LiveClass = ({ session, elapsed, onEnd }) => {
  const isDemo = session?.mode === "demo";
  const displayTitle = session?.title || "Untitled class";
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
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              isDemo ? "bg-amber-400" : "bg-red-400"
            }`}
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              isDemo ? "bg-amber-500" : "bg-red-500"
            }`}
          />
        </span>
        <span
          className={`text-[11px] font-semibold tracking-[0.14em] ${
            isDemo ? "text-amber-600" : "text-red-500"
          }`}
          data-testid="live-status"
        >
          {isDemo ? "SIMULATED DEMO" : "LIVE"}
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
          {displayTitle}
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
        <p className="mt-2 text-[13px] text-white/60" data-testid="mic-status">
          {isDemo ? "Simulated demo · no audio captured" : "Microphone connected"}
        </p>
      </div>

      <div
        className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5"
        data-testid="transcript-area"
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-slate-500">
          <FileText className="h-4 w-4 text-slate-400" strokeWidth={2} />
          TRANSCRIPT
        </div>
        <p
          className="mt-6 pb-6 text-center text-[14px] text-slate-400"
          data-testid="transcript-placeholder"
        >
          Live transcription will appear here
        </p>
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
        onClick={onEnd}
        data-testid="end-class-btn"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-[15px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      >
        <Square className="h-4 w-4 fill-current" />
        End Class
      </button>
    </motion.div>
  );
};
