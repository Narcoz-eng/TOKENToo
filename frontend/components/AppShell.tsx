import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <div className="min-h-screen bg-vault-radial text-white">
      <Sidebar active={active} />
      <div className="min-h-screen lg:pl-64">
        <TopBar />
        <main className="mx-auto w-full max-w-[1780px] px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

