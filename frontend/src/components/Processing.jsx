import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export const Processing = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
      data-testid="screen-processing"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="mb-6"
      >
        <Loader2 className="h-12 w-12 text-[#3b5bc4]" strokeWidth={2.4} />
      </motion.div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
        Saving your session
      </h2>
      <p className="mt-2 max-w-[260px] text-[14px] text-slate-500">
        Securing the recording and writing your class session to your record.
      </p>
      <p className="mt-6 text-[12px] text-slate-400" data-testid="processing-status">
        Processing…
      </p>
    </motion.div>
  );
};
