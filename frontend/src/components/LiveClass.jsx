import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { formatDuration } from "../lib/format";

export const LiveClass = ({ session, elapsed, onEnd }) => {
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
        <span className="text-[11px] font-semibold tracking-[0.14em] text-red-500" data-testid="live-status">
          LIVE {session?.mode === "demo" ? "· DEMO" : ""}
        </span>
      </div>

      <div
        className="relative mt-4 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl p-8 text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #172554 0%, #1e3a8a 55%, #2f49a3 100%)",
        }}
      >
        <p className="text-[13px] font-medium text-white/60">
          {session?.course_title}
        </p>
        <p className="mb-8 text-center text-lg font-semibold">{session?.topic}</p>

        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <Mic className="h-7 w-7 text-white" strokeWidth={2.2} />
          </div>
        </motion.div>

        <p
          className="mt-8 font-mono text-5xl font-semibold tabular-nums tracking-tight"
          data-testid="live-timer"
        >
          {formatDuration(elapsed)}
        </p>
        <p className="mt-2 text-[13px] text-white/60" data-testid="recording-status">
          Recording · {session?.mode === "demo" ? "demo session" : "microphone active"}
        </p>
      </div>

      <p className="mt-4 text-center text-[12px] text-slate-400">
        No transcript yet — this phase only records the session.
      </p>

      <button
        onClick={onEnd}
        data-testid="end-class-btn"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-[15px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      >
        <Square className="h-4 w-4 fill-current" />
        End class
      </button>
    </motion.div>
  );
};
