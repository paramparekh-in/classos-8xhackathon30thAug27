import { motion } from "framer-motion";
import { Mic, Loader2, Radio } from "lucide-react";

const CONFIG = {
  mic_permission: {
    icon: Mic,
    title: "Microphone access",
    sub: "Allow microphone access in your browser so ClassOS can record the class.",
    status: "Waiting for permission…",
    spin: false,
  },
  connecting: {
    icon: Radio,
    title: "Connecting to class",
    sub: "Setting up your live session.",
    status: "Connecting…",
    spin: true,
  },
  ending: {
    icon: Loader2,
    title: "Ending session",
    sub: "Wrapping up your recording.",
    status: "Ending…",
    spin: true,
  },
};

export const StatusScreen = ({ state }) => {
  const cfg = CONFIG[state] || CONFIG.connecting;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
      data-testid={`screen-${state}`}
    >
      <motion.div
        animate={cfg.spin ? { rotate: 360 } : { scale: [1, 1.08, 1] }}
        transition={{
          duration: cfg.spin ? 1.1 : 1.6,
          repeat: Infinity,
          ease: cfg.spin ? "linear" : "easeInOut",
        }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
      >
        <Icon className="h-8 w-8 text-[#3b5bc4]" strokeWidth={2.2} />
      </motion.div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{cfg.title}</h2>
      <p className="mt-2 max-w-[280px] text-[14px] text-slate-500">{cfg.sub}</p>
      <p className="mt-6 text-[12px] font-medium text-slate-400" data-testid="transient-status">
        {cfg.status}
      </p>
    </motion.div>
  );
};
