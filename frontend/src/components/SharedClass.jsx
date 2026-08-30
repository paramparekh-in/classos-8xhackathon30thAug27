import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { getShared } from "../lib/api";
import { NotesView, QuizView } from "./ClassContent";

export const SharedClass = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [tab, setTab] = useState("notes");

  useEffect(() => {
    getShared(slug)
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("notfound"));
  }, [slug]);

  return (
    <div
      className="min-h-screen w-full bg-[#e9eef7]"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 50% -10%, #eef3fb 0%, #e4ebf6 55%, #dfe7f4 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-5 pb-10 sm:px-6">
        <header className="flex items-center gap-2 pt-6 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#3b5bc4] to-[#1e3a8a] shadow-sm">
            <GraduationCap className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
          </div>
          <span className="text-[19px] font-bold tracking-tight text-slate-900">
            Class<span className="text-[#3b5bc4]">OS</span>
          </span>
        </header>

        <main className="flex flex-1 flex-col">
          {status === "loading" && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#3b5bc4]" />
            </div>
          )}

          {status === "notfound" && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-lg font-bold text-slate-900">Class not found</p>
              <p className="mt-1 text-[14px] text-slate-500">This shared link may have expired.</p>
            </div>
          )}

          {status === "ready" && data && (
            <>
              <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-[#6b7fb3]">
                SHARED CLASS
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {data.title || "Untitled class"}
              </h1>
              <p className="text-[12px] text-slate-400">{data.subject || "No subject"}</p>

              <div className="mt-4 flex rounded-2xl bg-slate-100 p-1">
                {["notes", "quiz"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-xl py-2 text-[13px] font-semibold capitalize transition-colors ${
                      tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex-1 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                {tab === "notes" && <NotesView notes={data.notes} />}
                {tab === "quiz" && <QuizView quiz={data.quiz} />}
              </div>
            </>
          )}

          <footer className="mt-8 text-center">
            <Link to="/" className="text-[12px] font-medium text-[#2f49a3] hover:underline">
              Made with ClassOS
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
};
