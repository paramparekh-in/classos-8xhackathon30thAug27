from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import secrets
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
import uuid
from datetime import datetime, timezone
from elevenlabs import AsyncElevenLabs
import llm


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ElevenLabs client (permanent key stays server-side only)
ELEVEN_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
eleven_client = AsyncElevenLabs(api_key=ELEVEN_API_KEY) if ELEVEN_API_KEY else None

app = FastAPI(title="ClassOS API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("classos")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


import re as _re


def _clamp_sentences(text, max_sentences):
    if not text:
        return text
    parts = _re.split(r"(?<=[.!?])\s+", str(text).strip())
    return " ".join(parts[:max_sentences]).strip()


# ---------- Models ----------
class SessionCreate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    mode: Literal["real", "demo", "replay"] = "real"
    source_session_id: Optional[str] = None


class SessionEnd(BaseModel):
    duration_seconds: int = 0


class TranscriptChunkIn(BaseModel):
    seq: int
    text: str
    timestamp: Optional[str] = None
    at_seconds: Optional[int] = None


class ClassSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = None
    subject: Optional[str] = None
    mode: str
    status: str  # live | processing | complete | error
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    created_at: str = Field(default_factory=now_iso)
    device_id: Optional[str] = None
    running_summary: Optional[str] = None
    catchup_covered_seq: int = -1
    catchup: Optional[dict] = None
    notes: Optional[dict] = None
    quiz: Optional[list] = None
    share_slug: Optional[str] = None


async def _transcript_lines(session_id: str, max_words: int = 6000):
    chunks = await db.transcript_chunks.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("seq", 1).to_list(5000)
    lines = []
    words = 0
    for c in chunks:
        t = c.get("at_seconds")
        prefix = f"[{t}s] " if isinstance(t, int) else ""
        lines.append(prefix + c["text"])
        words += len(c["text"].split())
    text = "\n".join(lines)
    if words > max_words:
        # keep the tail
        joined = text.split()
        text = " ".join(joined[-max_words:])
    return chunks, text, words


# ---------- Routes ----------
@api_router.get("/health")
async def health():
    db_ok = True
    try:
        await client.admin.command("ping")
    except Exception as e:  # noqa
        logger.error(f"DB ping failed: {e}")
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "ClassOS API",
        "database": "connected" if db_ok else "disconnected",
        "timestamp": now_iso(),
    }


@api_router.post("/sessions", response_model=ClassSession)
async def create_session(payload: SessionCreate, x_device_id: Optional[str] = Header(default=None)):
    title = (payload.title or "").strip() or None
    subject = (payload.subject or "").strip() or None
    session = ClassSession(
        title=title,
        subject=subject,
        mode=payload.mode,
        status="live",
        started_at=now_iso(),
        device_id=x_device_id,
    )
    await db.class_sessions.insert_one(session.model_dump())
    logger.info(f"Session {session.id} started (mode={payload.mode})")
    return session


@api_router.get("/sessions", response_model=List[ClassSession])
async def list_sessions(x_device_id: Optional[str] = Header(default=None)):
    if not x_device_id:
        return []
    docs = await db.class_sessions.find(
        {"device_id": x_device_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [ClassSession(**d) for d in docs]


@api_router.post("/sessions/{session_id}/end", response_model=ClassSession)
async def end_session(session_id: str, payload: SessionEnd):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")

    ended = now_iso()
    update = {
        "status": "processing",
        "ended_at": ended,
        "duration_seconds": payload.duration_seconds,
    }
    await db.class_sessions.update_one({"id": session_id}, {"$set": update})
    doc.update(update)
    return ClassSession(**doc)


@api_router.post("/sessions/{session_id}/finalize", response_model=ClassSession)
async def finalize_session(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")

    _, text, words = await _transcript_lines(session_id)
    notes = None
    quiz = None
    if words >= 1 and llm.has_key():
        try:
            notes = await llm.generate_notes(text, session_id)
        except Exception as e:  # noqa
            logger.error(f"Notes generation failed: {type(e).__name__}: {e}")
        try:
            quiz = await llm.generate_quiz(text, session_id)
        except Exception as e:  # noqa
            logger.error(f"Quiz generation failed: {type(e).__name__}: {e}")

    update = {"status": "complete", "notes": notes, "quiz": quiz}
    await db.class_sessions.update_one({"id": session_id}, {"$set": update})
    doc.update(update)
    return ClassSession(**doc)


@api_router.post("/sessions/{session_id}/notes", response_model=ClassSession)
async def regenerate_notes(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    _, text, words = await _transcript_lines(session_id)
    if not words or not llm.has_key():
        raise HTTPException(status_code=422, detail="Not enough transcript to generate notes")
    try:
        notes = await llm.generate_notes(text, session_id)
    except Exception as e:  # noqa
        logger.error(f"Notes regen failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Could not generate notes")
    await db.class_sessions.update_one({"id": session_id}, {"$set": {"notes": notes}})
    doc["notes"] = notes
    return ClassSession(**doc)


@api_router.post("/sessions/{session_id}/quiz", response_model=ClassSession)
async def regenerate_quiz(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    _, text, words = await _transcript_lines(session_id)
    if not words or not llm.has_key():
        raise HTTPException(status_code=422, detail="Not enough transcript to generate a quiz")
    try:
        quiz = await llm.generate_quiz(text, session_id)
    except Exception as e:  # noqa
        logger.error(f"Quiz regen failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Could not generate quiz")
    await db.class_sessions.update_one({"id": session_id}, {"$set": {"quiz": quiz}})
    doc["quiz"] = quiz
    return ClassSession(**doc)


@api_router.get("/sessions/{session_id}", response_model=ClassSession)
async def get_session(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return ClassSession(**doc)


@api_router.post("/sessions/{session_id}/scribe-token")
async def scribe_token(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    if doc.get("mode") != "real":
        raise HTTPException(status_code=400, detail="Transcription is only available in Real Mode")
    if doc.get("status") != "live":
        raise HTTPException(status_code=409, detail="Session is not active")
    if not eleven_client:
        raise HTTPException(status_code=503, detail="Transcription unavailable")
    try:
        res = await eleven_client.tokens.single_use.create(token_type="realtime_scribe")
    except Exception as e:  # noqa
        logger.error(f"Failed to mint scribe token: {type(e).__name__}")
        raise HTTPException(status_code=503, detail="Transcription unavailable")
    return {"token": res.token}


@api_router.post("/sessions/{session_id}/transcript")
async def add_transcript_chunk(session_id: str, chunk: TranscriptChunkIn):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    if doc.get("status") != "live":
        raise HTTPException(status_code=409, detail="Session is not active")
    text = (chunk.text or "").strip()
    if not text:
        return {"stored": False, "reason": "empty"}
    ts = chunk.timestamp or now_iso()
    result = await db.transcript_chunks.update_one(
        {"session_id": session_id, "seq": chunk.seq},
        {"$setOnInsert": {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "seq": chunk.seq,
            "text": text,
            "timestamp": ts,
            "at_seconds": chunk.at_seconds if isinstance(chunk.at_seconds, int) else None,
            "created_at": now_iso(),
        }},
        upsert=True,
    )
    return {"stored": result.upserted_id is not None, "seq": chunk.seq}


@api_router.get("/sessions/{session_id}/transcript")
async def get_transcript(session_id: str):
    chunks = await db.transcript_chunks.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("seq", 1).to_list(5000)
    return {"session_id": session_id, "chunks": chunks}


@api_router.post("/sessions/{session_id}/catchup")
async def catchup(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")

    chunks = await db.transcript_chunks.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("seq", 1).to_list(5000)

    covered = doc.get("catchup_covered_seq", -1)
    new_chunks = [c for c in chunks if c["seq"] > covered]
    total_words = sum(len(c["text"].split()) for c in chunks)

    # Too thin to say anything real yet.
    if total_words < 12 and not doc.get("running_summary"):
        payload = {"right_now": None, "how_we_got_here": None, "terms": [], "as_of_seconds": 0}
        return payload

    if not llm.has_key():
        raise HTTPException(status_code=503, detail="Catch Me Up unavailable")

    new_text = "\n".join(c["text"] for c in new_chunks) or "\n".join(c["text"] for c in chunks[-8:])
    last_at = next((c.get("at_seconds") for c in reversed(chunks) if isinstance(c.get("at_seconds"), int)), 0)

    try:
        data = await llm.generate_catchup(doc.get("running_summary"), new_text, last_at, session_id)
    except Exception as e:  # noqa
        logger.error(f"Catchup failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Catch Me Up unavailable")

    running = (data.get("running_summary") or "").strip() or doc.get("running_summary")
    max_seq = chunks[-1]["seq"] if chunks else covered
    result = {
        "right_now": _clamp_sentences(data.get("right_now"), 2),
        "how_we_got_here": _clamp_sentences(data.get("how_we_got_here"), 1),
        "terms": (data.get("terms") or [])[:2],
        "as_of_seconds": last_at,
    }
    await db.class_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "running_summary": running,
            "catchup_covered_seq": max_seq,
            "catchup": result,
        }},
    )
    return result


@api_router.post("/sessions/{session_id}/catchup/expand")
async def catchup_expand(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    if not llm.has_key():
        raise HTTPException(status_code=503, detail="Unavailable")
    chunks = await db.transcript_chunks.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("seq", 1).to_list(5000)
    if not chunks:
        return {"bullets": []}
    last_at = next((c.get("at_seconds") for c in reversed(chunks) if isinstance(c.get("at_seconds"), int)), None)
    if isinstance(last_at, int):
        recent = [c for c in chunks if isinstance(c.get("at_seconds"), int) and c["at_seconds"] >= last_at - 300]
    else:
        recent = chunks[-40:]
    recent_text = "\n".join(c["text"] for c in recent)
    try:
        data = await llm.generate_expand(recent_text, session_id)
    except Exception as e:  # noqa
        logger.error(f"Expand failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Unavailable")
    return {"bullets": (data.get("bullets") or [])[:5]}


@api_router.post("/sessions/{session_id}/share")
async def share_session(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    slug = doc.get("share_slug")
    if not slug:
        slug = secrets.token_urlsafe(8)
        await db.class_sessions.update_one({"id": session_id}, {"$set": {"share_slug": slug}})
    return {"slug": slug}


@api_router.get("/shared/{slug}")
async def get_shared(slug: str):
    doc = await db.class_sessions.find_one({"share_slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Shared class not found")
    return {
        "title": doc.get("title"),
        "subject": doc.get("subject"),
        "created_at": doc.get("created_at"),
        "duration_seconds": doc.get("duration_seconds"),
        "notes": doc.get("notes"),
        "quiz": doc.get("quiz"),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    await db.transcript_chunks.create_index(
        [("session_id", 1), ("seq", 1)], unique=True
    )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
