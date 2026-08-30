import { useState } from "react";
import { CheckCircle2, XCircle, Clock, HelpCircle, BookOpen, Hash, CircleHelp, RotateCw, Flag } from "lucide-react";
import { formatDuration } from "../lib/format";

const TimeChip = ({ t, onJump }) => {
  if (typeof t !== "number") return null;
  const label = formatDuration(t);
  return onJump ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onJump(t);
      }}
      className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#eef3fb] px-2 py-0.5 text-[11px] font-medium text-[#2f49a3] hover:bg-[#dce6fa]"
      data-testid="notes-timestamp"
    >
      <Clock className="h-3 w-3" /> {label}
    </button>
  ) : (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#eef3fb] px-2 py-0.5 text-[11px] font-medium text-[#2f49a3]">
      <Clock className="h-3 w-3" /> {label}
    </span>
  );
};

export const NotesView = ({ notes, onJumpTo, onRegenerate, regenerating }) => {
  if (!notes) {
    return (
      <div className="py-10 text-center" data-testid="notes-empty">
        <p className="text-[14px] text-slate-500">Notes aren't available for this class.</p>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            data-testid="regenerate-notes-btn"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
          >
            <RotateCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Generating…" : "Generate notes"}
          </button>
        )}
      </div>
    );
  }

  const Section = ({ icon: Icon, title, children }) => (
    <div className="mt-5 first:mt-0">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );

  return (
    <div data-testid="notes-view">
      {notes.flagged?.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4" data-testid="notes-flagged">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            <Flag className="h-3.5 w-3.5" /> You flagged these
          </div>
          <ul className="space-y-2">
            {notes.flagged.map((f, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-slate-700" data-testid="flagged-item">
                {f.explanation}
                <TimeChip t={f.t} onJump={onJumpTo} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[15px] font-semibold leading-snug text-slate-900" data-testid="notes-about">
        {notes.about}
      </p>
      {notes.thin && (
        <p className="mt-1 text-[12px] italic text-amber-600">
          This class was short, so these notes are brief.
        </p>
      )}

      {notes.key_points?.length > 0 && (
        <Section icon={BookOpen} title="Key points">
          <ul className="space-y-2.5">
            {notes.key_points.map((p, i) => (
              <li key={i} className="text-[14px] leading-relaxed text-slate-700" data-testid="notes-key-point">
                <span className="mr-1 text-[#3b5bc4]">•</span>
                {p.text}
                <TimeChip t={p.t} onJump={onJumpTo} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {notes.terms?.length > 0 && (
        <Section icon={CircleHelp} title="Terms defined">
          <div className="space-y-2">
            {notes.terms.map((t, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[13px] font-semibold text-slate-800">{t.term}</p>
                <p className="text-[13px] text-slate-500">{t.definition}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {notes.numbers?.length > 0 && (
        <Section icon={Hash} title="Numbers & examples">
          <ul className="space-y-1.5">
            {notes.numbers.map((n, i) => (
              <li key={i} className="text-[14px] leading-relaxed text-slate-700">
                <span className="mr-1 text-[#3b5bc4]">•</span>
                {n}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {notes.left_open?.length > 0 && (
        <Section icon={HelpCircle} title="Left open">
          <ul className="space-y-1.5">
            {notes.left_open.map((q, i) => (
              <li key={i} className="text-[14px] leading-relaxed text-slate-600">
                <span className="mr-1 text-amber-500">?</span>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          data-testid="regenerate-notes-btn"
          className="mt-6 inline-flex items-center gap-2 text-[12px] font-medium text-slate-400 hover:text-slate-600 disabled:opacity-60"
        >
          <RotateCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "Regenerating…" : "Regenerate notes"}
        </button>
      )}
    </div>
  );
};

export const QuizView = ({ quiz, onHearAgain, onRegenerate, regenerating }) => {
  const [answers, setAnswers] = useState({});
  const [orders, setOrders] = useState({});

  const tryAgain = () => {
    setAnswers({});
    const next = {};
    quiz.forEach((q, qi) => {
      const idx = q.options.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      next[qi] = idx;
    });
    setOrders(next);
  };

  if (!quiz || quiz.length === 0) {
    return (
      <div className="py-10 text-center" data-testid="quiz-empty">
        <p className="text-[14px] text-slate-500">No quiz is available for this class.</p>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            data-testid="regenerate-quiz-btn"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
          >
            <RotateCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Generating…" : "Generate quiz"}
          </button>
        )}
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const correctCount = quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.answer_index ? 1 : 0),
    0
  );
  const allAnswered = answeredCount === quiz.length;
  const missedList = quiz
    .map((q, i) => (answers[i] !== undefined && answers[i] !== q.answer_index ? { i, t: q.t } : null))
    .filter(Boolean);

  return (
    <div data-testid="quiz-view">
      {allAnswered && (
        <div className="mb-4 rounded-2xl bg-[#eef3fb] p-4" data-testid="quiz-score">
          <div className="flex items-center justify-between">
            <p className="text-[16px] font-bold text-[#2f49a3]">
              {correctCount}/{quiz.length} correct
            </p>
            <button
              onClick={tryAgain}
              data-testid="quiz-try-again-btn"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2f49a3] shadow-sm hover:bg-slate-50"
            >
              <RotateCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
          {missedList.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-500">
              Review:
              {missedList.map((m) =>
                onHearAgain && typeof m.t === "number" ? (
                  <button
                    key={m.i}
                    onClick={() => onHearAgain(m.t)}
                    className="rounded-full bg-white px-2 py-0.5 text-[12px] font-medium text-[#2f49a3] hover:underline"
                  >
                    Q{m.i + 1} · {formatDuration(m.t)}
                  </button>
                ) : (
                  <span key={m.i} className="text-slate-600">
                    Q{m.i + 1}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        {quiz.map((q, qi) => {
          const chosen = answers[qi];
          const answered = chosen !== undefined;
          return (
            <div key={qi} className="rounded-2xl border border-slate-100 p-4" data-testid="quiz-question">
              <p className="text-[14px] font-semibold text-slate-900">
                {qi + 1}. {q.q}
              </p>
              <div className="mt-3 space-y-2">
                {(orders[qi] || q.options.map((_, i) => i)).map((oi) => {
                  const opt = q.options[oi];
                  const isCorrect = oi === q.answer_index;
                  const isChosen = chosen === oi;
                  let cls = "border-slate-200 bg-white text-slate-700";
                  if (answered && isCorrect) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
                  else if (answered && isChosen && !isCorrect)
                    cls = "border-red-300 bg-red-50 text-red-800";
                  return (
                    <button
                      key={oi}
                      disabled={answered}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      data-testid="quiz-option"
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors ${cls} ${
                        answered ? "cursor-default" : "hover:border-[#3b5bc4]/40"
                      }`}
                    >
                      <span>{opt}</span>
                      {answered && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {answered && isChosen && !isCorrect && <XCircle className="h-4 w-4 text-red-500" />}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-[13px] text-slate-600">{q.explanation}</p>
                  {onHearAgain && typeof q.t === "number" && (
                    <button
                      onClick={() => onHearAgain(q.t)}
                      data-testid="hear-again-btn"
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#2f49a3] hover:underline"
                    >
                      <Clock className="h-3 w-3" /> Hear it again at {formatDuration(q.t)}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          data-testid="regenerate-quiz-btn"
          className="mt-6 inline-flex items-center gap-2 text-[12px] font-medium text-slate-400 hover:text-slate-600 disabled:opacity-60"
        >
          <RotateCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "Regenerating…" : "Regenerate quiz"}
        </button>
      )}
    </div>
  );
};
