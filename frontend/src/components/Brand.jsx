import { GraduationCap } from "lucide-react";

export const Brand = ({ testId = "brand-logo" }) => {
  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#3b5bc4] to-[#1e3a8a] shadow-sm">
        <GraduationCap className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
      </div>
      <span className="text-[19px] font-bold tracking-tight text-slate-900">
        Class<span className="text-[#3b5bc4]">OS</span>
      </span>
    </div>
  );
};
