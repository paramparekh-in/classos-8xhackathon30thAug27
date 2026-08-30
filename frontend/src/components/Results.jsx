import { motion } from "framer-motion";
import { CheckCircle2, Clock, Calendar, Radio } from "lucide-react";
import { formatDuration, formatClock } from "../lib/format";

const Row = ({ icon: Icon, label, value, testId }) => (
  <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
    <span className="flex items-center gap-2 text-[13px] text-slate-500">
      <Icon className="h-4 w-4 text-slate-400" strokeWidth={2} />
      {label}
    </span>
    <span className="text-[14px] font-semibold text-slate-800" data-testid={testId}>
      {value}
    </span>
  </div>
);

export const Results = ({ session, onDone }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-1 flex-col"
      data-testid="screen-results"
    >
      <div className="mt-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
        >
          <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={2.2} />
        </motion.div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
          Session complete
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Your class session has been saved.
        </p>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-[12px] font-medium text-[#6b7fb3]">
          {session?.course_title} · {session?.room}
        </p>
        <h2 className="mt-0.5 text-lg font-semibold text-slate-900" data-testid="results-topic">
          {session?.topic}
        </h2>

        <div className="mt-3">
          <Row
            icon={Clock}
            label="Duration"
            value={formatDuration(session?.duration_seconds)}
            testId="results-duration"
          />
          <Row
            icon={Calendar}
            label="Started"
            value={formatClock(session?.started_at)}
            testId="results-started"
          />
          <Row
            icon={Calendar}
            label="Ended"
            value={formatClock(session?.ended_at)}
            testId="results-ended"
          />
          <Row
            icon={Radio}
            label="Mode"
            value={session?.mode === "demo" ? "Demo" : "Real"}
            testId="results-mode"
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
          <span className="text-[13px] font-medium text-emerald-700">Status</span>
          <span
            className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
            data-testid="results-status"
          >
            {session?.status}
          </span>
        </div>
      </div>

      <button
        onClick={onDone}
        data-testid="results-done-btn"
        className="mt-6 w-full rounded-2xl bg-[#1e3a8a] py-4 text-[15px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      >
        Back to start
      </button>
    </motion.div>
  );
};
