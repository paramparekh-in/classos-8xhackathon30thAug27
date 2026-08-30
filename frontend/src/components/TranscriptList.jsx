import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

export const TranscriptList = ({ committed, partial }) => {
  const scrollRef = useRef(null);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [committed, partial, follow]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setFollow(atBottom);
  };

  const jumpToLive = () => {
    setFollow(true);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const empty = committed.length === 0 && !partial;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Transcript
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        data-testid="transcript-area"
      >
        {empty && (
          <p className="py-6 text-center text-[13px] text-slate-400" data-testid="transcript-placeholder">
            Live transcription will appear here
          </p>
        )}
        {committed.map((c) => (
          <p
            key={c.seq}
            className="text-[14px] leading-relaxed text-slate-500"
            data-testid="transcript-committed"
          >
            {c.text}
          </p>
        ))}
        {partial && (
          <p
            className="flex items-start gap-2 text-[14px] italic leading-relaxed text-slate-400"
            data-testid="transcript-partial"
          >
            <Loader2 className="mt-1 h-3 w-3 shrink-0 animate-spin text-[#3b5bc4]" />
            <span>{partial}</span>
          </p>
        )}
      </div>

      {!follow && (
        <button
          onClick={jumpToLive}
          data-testid="jump-to-live-btn"
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Jump to live
        </button>
      )}
    </div>
  );
};
