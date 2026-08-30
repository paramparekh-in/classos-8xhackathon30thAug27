import { motion } from "framer-motion";
import { Mic, Play } from "lucide-react";
import { todayLabel } from "../lib/format";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning, Param.";
  if (h < 17) return "Good afternoon, Param.";
  return "Good evening, Param.";
};

export const StartClass = ({ classInfo, onJoinReal, onJoinDemo, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-testid="screen-start-class"
    >
      <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-[#6b7fb3]">
        {todayLabel()}
      </p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
        {greeting()}
      </h1>
      <p className="mt-1 text-[15px] text-slate-500">
        {classInfo ? "One class is ready to join." : "Loading your class…"}
      </p>

      {classInfo && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
          className="relative mt-6 overflow-hidden rounded-3xl p-6 text-white shadow-xl"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #1e3a8a 0%, #2f49a3 55%, #3b5bc4 100%)",
          }}
          data-testid="class-card"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full border border-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-6 top-8 h-40 w-40 rounded-full border border-white/10"
            aria-hidden
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#34d399]" />
              <span className="text-[11px] font-semibold tracking-[0.14em] text-emerald-200">
                STARTING NOW
              </span>
            </div>
            <span className="text-[12px] text-white/70" data-testid="class-room">
              {classInfo.room}
            </span>
          </div>

          <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[15px] font-bold ring-1 ring-white/15">
            {classInfo.code}
          </div>

          <p className="mt-4 text-[13px] font-medium text-white/70">
            {classInfo.course_title}
          </p>
          <h2 className="text-2xl font-semibold leading-tight" data-testid="class-topic">
            {classInfo.topic}
          </h2>
          <p className="mt-2 text-[13px] text-white/70">
            {classInfo.professor} &nbsp;·&nbsp; {classInfo.time_range}
          </p>

          <button
            onClick={onJoinReal}
            disabled={loading}
            data-testid="join-live-class-btn"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-[15px] font-semibold text-slate-900 shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            <Mic className="h-[18px] w-[18px]" strokeWidth={2.2} />
            Join live class
          </button>

          <button
            onClick={onJoinDemo}
            disabled={loading}
            data-testid="demo-session-btn"
            className="mt-3 flex w-full items-center justify-center gap-2 text-[13px] font-medium text-white/75 transition-colors hover:text-white"
          >
            <Play className="h-[13px] w-[13px] fill-current" />
            Reliable demo session
          </button>
        </motion.div>
      )}

      <p className="mt-6 text-center text-[12px] text-slate-400" data-testid="phase-note">
        Phase 1 · Real Mode records your class. Live notes and quizzes arrive later.
      </p>
    </motion.div>
  );
};
