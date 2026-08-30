import axios from "axios";
import "./device";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const getHealth = async () => {
  const { data } = await axios.get(`${API}/health`);
  return data;
};

export const createSession = async ({ title, subject, mode }) => {
  const { data } = await axios.post(`${API}/sessions`, {
    title,
    subject,
    mode,
  });
  return data;
};

export const endSession = async (sessionId, durationSeconds) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/end`, {
    duration_seconds: durationSeconds,
  });
  return data;
};

export const finalizeSession = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/finalize`);
  return data;
};

export const getSession = async (sessionId) => {
  const { data } = await axios.get(`${API}/sessions/${sessionId}`);
  return data;
};

export const getScribeToken = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/scribe-token`);
  return data.token;
};

export const postTranscriptChunk = async (sessionId, { seq, text, timestamp, at_seconds }) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/transcript`, {
    seq,
    text,
    timestamp,
    at_seconds,
  });
  return data;
};

export const getTranscript = async (sessionId) => {
  const { data } = await axios.get(`${API}/sessions/${sessionId}/transcript`);
  return data;
};

export const listSessions = async () => {
  const { data } = await axios.get(`${API}/sessions`);
  return data;
};

export const getCatchup = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/catchup`);
  return data;
};

export const expandCatchup = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/catchup/expand`);
  return data;
};

export const regenerateNotes = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/notes`);
  return data;
};

export const regenerateQuiz = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/quiz`);
  return data;
};

export const shareSession = async (sessionId) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/share`);
  return data.slug;
};

export const getShared = async (slug) => {
  const { data } = await axios.get(`${API}/shared/${slug}`);
  return data;
};

export const flagMoment = async (sessionId, at_seconds) => {
  const { data } = await axios.post(`${API}/sessions/${sessionId}/flag`, { at_seconds });
  return data;
};
