import { motion } from "framer-motion";
import { Mic, Play } from "lucide-react";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#3b5bc4] focus:ring-2 focus:ring-[#3b5bc4]/15";

export const StartClass = ({
  title,
  subject,
  onTitleChange,
  onSubjectChange,
  onJoinReal,
  onJoinDemo,
  loading,
}) => {
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
          <label
            htmlFor="class-title"
            className="mb-1.5 block text-[13px] font-medium text-slate-600"
          >
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
          <label
            htmlFor="class-subject"
            className="mb-1.5 block text-[13px] font-medium text-slate-600"
          >
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

      <p className="mt-6 text-center text-[12px] text-slate-400" data-testid="phase-note">
        No account, schedule, or class history needed — everything starts from here.
      </p>
    </motion.div>
  );
};
