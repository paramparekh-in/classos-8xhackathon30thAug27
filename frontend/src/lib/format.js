export const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export const formatClock = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

export const todayLabel = () => {
  return new Date()
    .toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
};

export const formatMinutes = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  if (s < 60) return `${s} sec`;
  return `${Math.round(s / 60)} min`;
};

export const formatStart = (iso) => {
  if (!iso) return "";
  try {
    const t = new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `started ${t.toLowerCase()}`;
  } catch {
    return "";
  }
};
