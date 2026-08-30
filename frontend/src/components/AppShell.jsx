import { Brand } from "./Brand";

export const AppShell = ({ children }) => {
  return (
    <div
      className="min-h-screen w-full bg-[#e9eef7]"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 50% -10%, #eef3fb 0%, #e4ebf6 55%, #dfe7f4 100%)",
      }}
      data-testid="app-shell"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-5 pb-10 sm:px-6">
        <header className="flex items-center justify-between pt-6 pb-2">
          <Brand />
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#3b5bc4] shadow-sm ring-1 ring-black/5"
            data-testid="avatar-badge"
          >
            PP
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
};
