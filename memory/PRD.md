# ClassOS — Product Requirements Document

## Original Problem Statement
Full-stack ClassOS app (React + FastAPI + MongoDB). Phase 1 only:
recreate the visual style of https://classos.paramparekh.chatgpt.site/, build four
screens (Start Class, Live Class, Processing, Results), honest states (idle,
microphone permission, connecting, live, ending, processing, complete, error),
MongoDB class-session structure + GET /api/health. Real Mode must NOT display
scripted/sample transcript. NO ElevenLabs, Catch Me Up, notes, quiz, auth,
dashboards, uploads, or extra features. Connect to GitHub.

## Architecture
- Frontend: React 19, Tailwind, framer-motion, lucide-react. Single-page state
  machine in `App.js` orchestrating screen components under `AppShell`.
- Backend: FastAPI, Motor (async MongoDB). All routes under `/api`.
- DB: MongoDB collections `classes` (seeded current class) and `class_sessions`.

## User Personas
- Student ("Param") joining a live class, recording it, and reviewing a saved
  session summary.

## Core Requirements (static)
- Faithful visual recreation of reference (blue gradient hero, calm light-blue UI).
- Four screens + eight honest states.
- No scripted transcript in Real Mode.
- Phase-1 scope only; no auth/notes/quiz/uploads.

## Implemented (2026-08-30)
- GET /api/health (status + DB connectivity).
- GET /api/classes/current (seeded Consumer Behaviour class).
- Session lifecycle: POST /api/sessions, POST /api/sessions/{id}/end (-> processing),
  POST /api/sessions/{id}/finalize (-> complete), GET /api/sessions/{id}.
- Start Class, Live Class (real mic capture + timer, no transcript), Processing
  (real save step), Results (duration/timestamps/mode/status from MongoDB).
- Honest states incl. real microphone permission grant/deny + error screen.
- Real + Demo modes.
- Verified: backend pytest 11/11, frontend flows 100% (testing agent iteration_1).

## Backlog (future phases)
- P1: Live transcription (real audio pipeline), ElevenLabs voice.
- P1: "Catch Me Up" catch-up summaries.
- P1: Auto notes generation.
- P2: Grounded quiz / knowledge check.
- P2: Classes list, Home dashboard, multiple classes, history list.
- P2: Auth, uploads.
- Tech debt: migrate FastAPI startup/shutdown to lifespan; optional session
  status-transition guards.

## Next Tasks
1. Confirm GitHub connection (user clicks "Save to GitHub").
2. Choose next feature: live transcription vs notes vs quiz.
