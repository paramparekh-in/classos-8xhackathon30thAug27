import axios from "axios";

const KEY = "classos_device_id";

export const getDeviceId = () => {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
      `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
};

// Attach the device id to every request so the backend can scope sessions.
axios.defaults.headers.common["X-Device-Id"] = getDeviceId();
