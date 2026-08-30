import { Brand } from "./Brand";

export const AppShell = ({ children, fill = false }) => {
  return (
    <div
      className={`w-full bg-[#e9eef7] ${fill ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 50% -10%, #eef3fb 0%, #e4ebf6 55%, #dfe7f4 100%)",
      }}
      data-testid="app-shell"
    >
      <div
        className={`mx-auto flex w-full max-w-[460px] flex-col px-5 sm:px-6 ${
          fill ? "h-full overflow-hidden pb-4" : "min-h-screen pb-10"
        }`}
      >
        <header className="flex items-center justify-between pt-6 pb-2">
          <Brand />
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#3b5bc4] shadow-sm ring-1 ring-black/5"
            data-testid="avatar-badge"
          >
            PP
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
};
