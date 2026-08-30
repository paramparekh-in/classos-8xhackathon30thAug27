import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export const ErrorScreen = ({ message, onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
      data-testid="screen-error"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={2.2} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h2>
      <p
        className="mt-2 max-w-[300px] text-[14px] text-slate-500"
        data-testid="error-message"
      >
        {message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={onRetry}
        data-testid="error-retry-btn"
        className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        Back to start
      </button>
    </motion.div>
  );
};
