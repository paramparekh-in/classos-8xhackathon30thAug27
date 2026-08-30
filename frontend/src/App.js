import { useEffect, useRef, useState, useCallback } from "react";
import "@/App.css";
import { AppShell } from "@/components/AppShell";
import { StartClass } from "@/components/StartClass";
import { LiveClass } from "@/components/LiveClass";
import { LiveClassReal } from "@/components/LiveClassReal";
import { Processing } from "@/components/Processing";
import { Results } from "@/components/Results";
import { StatusScreen } from "@/components/StatusScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import {
  createSession,
  endSession,
  finalizeSession,
  getSession,
  getTranscript,
} from "@/lib/api";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function App() {
  const [phase, setPhase] = useState("idle");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [session, setSession] = useState(null);
  const [replayScript, setReplayScript] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTsRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTsRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
    }, 250);
  }, []);

  const beginLive = useCallback(
    async (mode, tt = title, ss = subject) => {
      const created = await createSession({
        title: (tt || "").trim() || null,
        subject: (ss || "").trim() || null,
        mode,
      });
      setSession(created);
      setPhase("live");
      startTimer();
    },
    [title, subject, startTimer]
  );

  const handleJoinReal = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    setReplayScript(null);
    setPhase("mic_permission");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser does not support microphone capture.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // We only needed the permission gate; the scribe hook opens its own stream.
      stopStream();
      setPhase("connecting");
      await sleep(600);
      await beginLive("real");
    } catch (e) {
      stopStream();
      const msg =
        e?.name === "NotAllowedError" || e?.name === "SecurityError"
          ? "Microphone permission was denied. Enable it in your browser to record a live class."
          : e?.message || "Could not start the live class.";
      setErrorMsg(msg);
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [busy, beginLive, stopStream]);

  const handleJoinDemo = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    setReplayScript(null);
    setPhase("connecting");
    try {
      await sleep(600);
      await beginLive("demo");
    } catch (e) {
      setErrorMsg(e?.message || "Could not start the demo session.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [busy, beginLive]);

  const handleReplay = useCallback(
    async (src) => {
      if (busy) return;
      setBusy(true);
      setErrorMsg("");
      setPhase("connecting");
      try {
        const tr = await getTranscript(src.id);
        const script = (tr.chunks || []).map((c, i) => ({
          t: typeof c.at_seconds === "number" ? c.at_seconds : i * 6,
          text: c.text,
        }));
        if (!script.length) throw new Error("That class has no transcript to replay.");
        setReplayScript(script);
        await sleep(400);
        await beginLive("replay", src.title, src.subject);
      } catch (e) {
        setErrorMsg(e?.message || "Could not replay that class.");
        setPhase("error");
      } finally {
        setBusy(false);
      }
    },
    [busy, beginLive]
  );

  const handleOpenSession = useCallback((s) => {
    setReplayScript(null);
    setSession(s);
    setPhase("complete");
  }, []);

  const handleEnd = useCallback(async () => {
    if (!session) return;
    const finalSeconds = Math.floor((Date.now() - startTsRef.current) / 1000);
    stopTimer();
    stopStream();
    setPhase("ending");
    try {
      await sleep(500);
      await endSession(session.id, finalSeconds);
      setPhase("processing");
      await finalizeSession(session.id);
      const finished = await getSession(session.id);
      setSession(finished);
      setPhase("complete");
    } catch (e) {
      setErrorMsg(e?.message || "Could not save your session.");
      setPhase("error");
    }
  }, [session, stopTimer, stopStream]);

  const reset = useCallback(() => {
    stopTimer();
    stopStream();
    setSession(null);
    setReplayScript(null);
    setElapsed(0);
    setErrorMsg("");
    setTitle("");
    setSubject("");
    setPhase("idle");
    setRefreshKey((k) => k + 1);
  }, [stopTimer, stopStream]);

  useEffect(
    () => () => {
      stopTimer();
      stopStream();
    },
    [stopTimer, stopStream]
  );

  const render = () => {
    switch (phase) {
      case "idle":
        return (
          <StartClass
            title={title}
            subject={subject}
            onTitleChange={setTitle}
            onSubjectChange={setSubject}
            onJoinReal={handleJoinReal}
            onJoinDemo={handleJoinDemo}
            onReplay={handleReplay}
            onOpenSession={handleOpenSession}
            loading={busy}
            refreshKey={refreshKey}
          />
        );
      case "mic_permission":
      case "connecting":
      case "ending":
        return <StatusScreen state={phase} />;
      case "live":
        return session?.mode === "real" ? (
          <LiveClassReal session={session} elapsed={elapsed} onEnd={handleEnd} />
        ) : (
          <LiveClass
            session={session}
            elapsed={elapsed}
            onEnd={handleEnd}
            script={session?.mode === "replay" ? replayScript : undefined}
          />
        );
      case "processing":
        return <Processing />;
      case "complete":
        return <Results session={session} onDone={reset} />;
      case "error":
        return <ErrorScreen message={errorMsg} onRetry={reset} />;
      default:
        return null;
    }
  };

  return <AppShell fill={phase === "live"}>{render()}</AppShell>;
}

export default App;
