import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";

const ago = (ts, now) => {
  if (!ts) return null;
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `updated ${s}s ago`;
  const m = Math.floor(s / 60);
  return `updated ${m}m ago`;
};

export const CatchMeUpCard = ({ catchup, paused }) => {
  const { data, updatedAt, pulse, expanded, expandBullets, loadingExpand, toggleExpand } = catchup;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);

  const hasData = data && data.right_now;

  return (
    <motion.button
      type="button"
      onClick={toggleExpand}
      layout
      className="relative w-full overflow-hidden rounded-3xl border border-[#c7d6f5] bg-white p-5 text-left shadow-[0_10px_40px_-12px_rgba(37,74,163,0.45)] ring-1 ring-[#3b5bc4]/5 transition-shadow"
      data-testid="catch-me-up-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-[#3b5bc4]/10">
            <Sparkles className="h-3.5 w-3.5 text-[#3b5bc4]" strokeWidth={2.4} />
            {pulse && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 rounded-lg bg-[#3b5bc4]/40"
              />
            )}
          </span>
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#2f49a3]">
            Catch Me Up
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          {updatedAt ? ago(updatedAt, now) : null}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </div>

      <div className="relative mt-3 min-h-[52px]">
        {!hasData && (
          <div className="flex items-center gap-2" data-testid="catch-me-up-status">
            {paused ? (
              <span className="text-[14px] text-slate-400">
                Catch Me Up paused — transcription unavailable.
              </span>
            ) : (
              <>
                <span className="h-3 w-3 animate-pulse rounded-full bg-[#3b5bc4]/40" />
                <span className="text-[15px] text-slate-400">Listening…</span>
              </>
            )}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {hasData && (
            <motion.div
              key={data.right_now}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, position: "absolute", top: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <p className="text-[16px] font-semibold leading-snug text-slate-900" data-testid="catch-me-up-now">
                {data.right_now}
              </p>
              {data.how_we_got_here && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500" data-testid="catch-me-up-context">
                  {data.how_we_got_here}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasData && data.terms && data.terms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.terms.map((t, i) => (
            <span
              key={i}
              className="rounded-full bg-[#eef3fb] px-2.5 py-1 text-[11px] font-medium text-[#2f49a3]"
              data-testid="catch-me-up-term"
              title={t.gloss}
            >
              {t.term} · {t.gloss}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            data-testid="catch-me-up-expanded"
          >
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                The last 5 minutes
              </p>
              {loadingExpand && (
                <div className="flex items-center gap-2 text-[13px] text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Summarizing…
                </div>
              )}
              {!loadingExpand && expandBullets && expandBullets.length > 0 && (
                <ul className="space-y-1.5">
                  {expandBullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#3b5bc4]" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {!loadingExpand && expandBullets && expandBullets.length === 0 && (
                <p className="text-[13px] text-slate-400">Not enough yet to summarize.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
