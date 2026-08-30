from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="ClassOS API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("classos")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class SessionCreate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    mode: Literal["real", "demo"] = "real"


class SessionEnd(BaseModel):
    duration_seconds: int = 0


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
async def create_session(payload: SessionCreate):
    title = (payload.title or "").strip() or None
    subject = (payload.subject or "").strip() or None
    session = ClassSession(
        title=title,
        subject=subject,
        mode=payload.mode,
        status="live",
        started_at=now_iso(),
    )
    await db.class_sessions.insert_one(session.model_dump())
    logger.info(f"Session {session.id} started (mode={payload.mode})")
    return session


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

    await db.class_sessions.update_one(
        {"id": session_id}, {"$set": {"status": "complete"}}
    )
    doc["status"] = "complete"
    return ClassSession(**doc)


@api_router.get("/sessions/{session_id}", response_model=ClassSession)
async def get_session(session_id: str):
    doc = await db.class_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return ClassSession(**doc)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
