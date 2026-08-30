import { useEffect, useRef, useState, useCallback } from "react";
import "@/App.css";
import { AppShell } from "@/components/AppShell";
import { StartClass } from "@/components/StartClass";
import { LiveClass } from "@/components/LiveClass";
import { Processing } from "@/components/Processing";
import { Results } from "@/components/Results";
import { StatusScreen } from "@/components/StatusScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import {
  getCurrentClass,
  createSession,
  endSession,
  finalizeSession,
  getSession,
} from "@/lib/api";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function App() {
  const [phase, setPhase] = useState("idle");
  const [classInfo, setClassInfo] = useState(null);
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTsRef = useRef(null);

  useEffect(() => {
    getCurrentClass()
      .then(setClassInfo)
      .catch(() => setClassInfo(null));
  }, []);

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
    async (mode) => {
      const created = await createSession({
        classId: classInfo.id,
        mode,
      });
      setSession(created);
      setPhase("live");
      startTimer();
    },
    [classInfo, startTimer]
  );

  const handleJoinReal = useCallback(async () => {
    if (!classInfo || busy) return;
    setBusy(true);
    setErrorMsg("");
    setPhase("mic_permission");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser does not support microphone capture.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPhase("connecting");
      await sleep(700);
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
  }, [classInfo, busy, beginLive, stopStream]);

  const handleJoinDemo = useCallback(async () => {
    if (!classInfo || busy) return;
    setBusy(true);
    setErrorMsg("");
    setPhase("connecting");
    try {
      await sleep(700);
      await beginLive("demo");
    } catch (e) {
      setErrorMsg(e?.message || "Could not start the demo session.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [classInfo, busy, beginLive]);

  const handleEnd = useCallback(async () => {
    if (!session) return;
    const finalSeconds = Math.floor((Date.now() - startTsRef.current) / 1000);
    stopTimer();
    stopStream();
    setPhase("ending");
    try {
      await sleep(600);
      await endSession(session.id, finalSeconds);
      setPhase("processing");
      await sleep(1200);
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
    setElapsed(0);
    setErrorMsg("");
    setPhase("idle");
  }, [stopTimer, stopStream]);

  useEffect(() => () => {
    stopTimer();
    stopStream();
  }, [stopTimer, stopStream]);

  const render = () => {
    switch (phase) {
      case "idle":
        return (
          <StartClass
            classInfo={classInfo}
            onJoinReal={handleJoinReal}
            onJoinDemo={handleJoinDemo}
            loading={busy}
          />
        );
      case "mic_permission":
      case "connecting":
      case "ending":
        return <StatusScreen state={phase} />;
      case "live":
        return <LiveClass session={session} elapsed={elapsed} onEnd={handleEnd} />;
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

  return <AppShell>{render()}</AppShell>;
}

export default App;
