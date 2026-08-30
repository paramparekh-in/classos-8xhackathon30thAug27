import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Share2, ArrowLeft } from "lucide-react";
import { formatDuration, formatClock, formatMinutes, formatStart } from "../lib/format";
import { getTranscript, regenerateNotes, regenerateQuiz, shareSession } from "../lib/api";
import { NotesView, QuizView } from "./ClassContent";

const TABS = [
  { key: "notes", label: "Notes" },
  { key: "quiz", label: "Quiz" },
  { key: "transcript", label: "Transcript" },
];

export const Results = ({ session, onDone }) => {
  const [tab, setTab] = useState("notes");
  const [notes, setNotes] = useState(session?.notes || null);
  const [quiz, setQuiz] = useState(session?.quiz || null);
  const [chunks, setChunks] = useState([]);
  const [regenNotes, setRegenNotes] = useState(false);
  const [regenQuiz, setRegenQuiz] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pendingT, setPendingT] = useState(null);

  const scrollRef = useRef(null);
  const rowRefs = useRef({});

  useEffect(() => {
    if (session?.id) {
      getTranscript(session.id)
        .then((d) => setChunks(d.chunks || []))
        .catch(() => setChunks([]));
    }
  }, [session?.id]);

  useEffect(() => {
    if (tab !== "transcript" || pendingT == null || chunks.length === 0) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let target = null;
        for (const c of chunks) {
          if (typeof c.at_seconds === "number" && c.at_seconds <= pendingT) target = c;
        }
        target = target || chunks[0];
        const el = rowRefs.current[target?.seq];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("bg-[#eef3fb]");
          setTimeout(() => el.classList.remove("bg-[#eef3fb]"), 1500);
        }
        setPendingT(null);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [tab, pendingT, chunks]);

  const jumpTo = (t) => {
    setTab("transcript");
    setPendingT(t);
  };

  const doRegenNotes = async () => {
    setRegenNotes(true);
    try {
      const s = await regenerateNotes(session.id);
      setNotes(s.notes);
    } catch {
      toast.error("Couldn't generate notes. Try again.");
    } finally {
      setRegenNotes(false);
    }
  };

  const doRegenQuiz = async () => {
    setRegenQuiz(true);
    try {
      const s = await regenerateQuiz(session.id);
      setQuiz(s.quiz);
    } catch {
      toast.error("Couldn't generate the quiz. Try again.");
    } finally {
      setRegenQuiz(false);
    }
  };

  const doShare = async () => {
    setSharing(true);
    let url;
    try {
      const slug = await shareSession(session.id);
      url = `${window.location.origin}/s/${slug}`;
    } catch {
      toast.error("Couldn't create a share link. Try again.");
      setSharing(false);
      return;
    }
    // The link exists no matter what happens next — never lose it.
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      if (navigator.share) {
        try {
          await navigator.share({ title: session?.title || "ClassOS notes", url });
        } catch {
          window.prompt("Copy your share link:", url);
        }
      } else {
        window.prompt("Copy your share link:", url);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-1 flex-col"
      data-testid="screen-results"
    >
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onDone}
          data-testid="results-done-btn"
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Start
        </button>
        <button
          onClick={doShare}
          disabled={sharing}
          data-testid="share-btn"
          className="flex items-center gap-1.5 rounded-full bg-[#1e3a8a] px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#2f49a3] disabled:opacity-60"
        >
          <Share2 className="h-3.5 w-3.5" /> Share notes
        </button>
      </div>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900" data-testid="results-topic">
        {session?.title || "Untitled class"}
      </h1>
      <p className="text-[12px] text-slate-400" data-testid="results-meta">
        {session?.subject || "No subject"} · {formatMinutes(session?.duration_seconds)} ·{" "}
        {formatStart(session?.started_at)} ·{" "}
        {session?.mode === "demo" ? "Demo" : session?.mode === "replay" ? "Replay" : "Real"}
      </p>

      <div className="mt-4 flex rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
            className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        {tab === "notes" && (
          <NotesView
            notes={notes}
            onJumpTo={jumpTo}
            onRegenerate={doRegenNotes}
            regenerating={regenNotes}
          />
        )}
        {tab === "quiz" && (
          <QuizView
            quiz={quiz}
            onHearAgain={jumpTo}
            onRegenerate={doRegenQuiz}
            regenerating={regenQuiz}
          />
        )}
        {tab === "transcript" && (
          <div ref={scrollRef} className="max-h-[460px] space-y-2 overflow-y-auto" data-testid="results-transcript">
            {chunks.length === 0 && (
              <p className="py-8 text-center text-[14px] text-slate-400">No transcript recorded.</p>
            )}
            {chunks.map((c) => (
              <p
                key={c.seq}
                ref={(el) => (rowRefs.current[c.seq] = el)}
                className="rounded-lg px-2 py-1 text-[14px] leading-relaxed text-slate-700 transition-colors"
              >
                {typeof c.at_seconds === "number" && (
                  <span className="mr-2 font-mono text-[11px] text-slate-400">
                    {formatDuration(c.at_seconds)}
                  </span>
                )}
                {c.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
