"""LLM helpers for ClassOS (GPT-5.4 Mini via Emergent universal key)."""
import os
import json
import asyncio
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("classos.llm")

PROVIDER = "openai"
MODEL = "gpt-5.4-mini"


def _key():
    return os.environ.get("EMERGENT_LLM_KEY")


def has_key() -> bool:
    return bool(_key())


def _parse_json(text: str):
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
    start = t.find("{")
    end = t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)


async def _ask_json(system: str, prompt: str, session_id: str, timeout: int = 30):
    key = _key()
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    chat = LlmChat(
        api_key=key,
        session_id=session_id,
        system_message=system,
    ).with_model(PROVIDER, MODEL)
    resp = await asyncio.wait_for(chat.send_message(UserMessage(text=prompt)), timeout=timeout)
    return _parse_json(resp)


CATCHUP_SYSTEM = (
    "You are Catch Me Up, a live assistant for a student who just glanced down at "
    "their phone during a lecture. You get a rolling summary of the class so far and "
    "the most recent transcript. Respond with STRICT JSON only, no markdown, matching:\n"
    '{"right_now": string|null, "how_we_got_here": string|null, '
    '"terms": [{"term": string, "gloss": string}], "running_summary": string}\n'
    "Rules: right_now = what the professor is explaining at THIS moment (1-2 sentences). "
    "how_we_got_here = ONE sentence connecting from a few minutes ago to now. "
    "MAXIMUM 3 sentences total across right_now and how_we_got_here. Plain language, no "
    "bullet points, no preamble. Do NOT start with 'the professor is discussing' — start "
    "with the substance. Ground STRICTLY in the transcript; never invent. If the transcript "
    "is too thin to say anything real, set right_now to null. At most 2 terms, only ones "
    "actually said aloud recently, gloss 6-12 words plain English. running_summary = an "
    "updated rolling summary of the whole class so far in 150 words or fewer, folding in the "
    "new transcript."
)


async def generate_catchup(running_summary, new_text, as_of, session_id, compress=False):
    extra = (
        "\n\nYour previous answer was TOO LONG. Compress hard: right_now at most 2 short "
        "sentences, how_we_got_here at most 1 short sentence, ~45 words total."
        if compress
        else ""
    )
    prompt = (
        f"Rolling summary so far:\n{running_summary or '(none yet)'}\n\n"
        f"New transcript since last update:\n{new_text or '(none)'}\n\n"
        f"Current time in class: {as_of} seconds.\nReturn the JSON now.{extra}"
    )
    data = await _ask_json(CATCHUP_SYSTEM, prompt, session_id, timeout=25)
    return data


EXPAND_SYSTEM = (
    "You summarize the last five minutes of a live lecture for a student. Respond with "
    'STRICT JSON only: {"bullets": [up to 5 short plain-English strings]}. Ground strictly '
    "in the transcript, no outside knowledge, no preamble."
)


async def generate_expand(recent_text, session_id):
    prompt = f"Recent transcript (last few minutes):\n{recent_text}\n\nReturn the JSON now."
    return await _ask_json(EXPAND_SYSTEM, prompt, session_id, timeout=25)


NOTES_SYSTEM = (
    "You produce study notes grounded STRICTLY in what was said in this class transcript. "
    "Only include what was actually discussed — no textbook padding, no outside knowledge. "
    "Respond with STRICT JSON only:\n"
    '{"about": string, "key_points": [{"text": string, "t": number}], '
    '"terms": [{"term": string, "definition": string}], "numbers": [string], '
    '"left_open": [string], "thin": boolean}\n'
    "about = one line on what this class was about. key_points = 5 to 8 points, each with "
    "t = the transcript timestamp in seconds it was said. terms = terms defined in class with "
    "the professor's own definition. numbers = any numbers or worked examples actually used. "
    "left_open = questions the professor raised and did not answer. Include a term ONLY if the "
    "professor explicitly defined it AND a student in this course could plausibly not know it "
    "(skip obvious ones like 'debt' or 'equity'); at most 6 terms. If the class was short or "
    "the audio thin, produce FEWER points and set thin=true. Never pad to hit a count."
)


async def generate_notes(transcript_text, session_id):
    prompt = f"Class transcript (each line prefixed with its second):\n{transcript_text}\n\nReturn the JSON now."
    return await _ask_json(NOTES_SYSTEM, prompt, session_id, timeout=45)


QUIZ_SYSTEM = (
    "You write a quiz grounded STRICTLY in this lecture transcript. Respond with STRICT JSON "
    'only: {"questions": [{"q": string, "options": [4 strings], "answer_index": number, '
    '"explanation": string, "t": number}]}\n'
    "Produce exactly 5 multiple-choice questions (fewer ONLY if the lecture truly cannot "
    "support 5). Each has 4 options, one correct answer (answer_index 0-3), a one-line "
    "explanation, and t = the transcript timestamp in seconds the answer came from. Questions "
    "must test UNDERSTANDING of THIS lecture (why the professor made a move, what a number "
    "implied), not generic definitional recall. No outside knowledge."
)


async def generate_quiz(transcript_text, session_id):
    prompt = f"Class transcript (each line prefixed with its second):\n{transcript_text}\n\nReturn the JSON now."
    data = await _ask_json(QUIZ_SYSTEM, prompt, session_id, timeout=45)
    return data.get("questions", [])


FLAG_SYSTEM = (
    "A student tapped 'I'm lost' at certain moments in a lecture. For each flagged second, explain "
    "in 1-2 plain sentences what was being discussed at that point in the transcript, grounded "
    "strictly in the transcript. Respond with STRICT JSON only: "
    '{"flagged": [{"t": number, "explanation": string}]}. Keep each explanation short and concrete.'
)


async def generate_flag_explanations(transcript_text, flags, session_id):
    prompt = (
        f"Class transcript (each line prefixed with its second):\n{transcript_text}\n\n"
        f"Flagged seconds: {flags}\n\nReturn the JSON now."
    )
    data = await _ask_json(FLAG_SYSTEM, prompt, session_id, timeout=45)
    return data.get("flagged", [])
