import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const getHealth = async () => {
  const { data } = await axios.get(`${API}/health`);
  return data;
};

export const getCurrentClass = async () => {
  const { data } = await axios.get(`${API}/classes/current`);
  return data;
};

export const createSession = async ({ classId, mode }) => {
  const { data } = await axios.post(`${API}/sessions`, {
    class_id: classId,
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
