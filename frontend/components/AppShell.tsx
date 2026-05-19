import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellStats = {
  collections?: number | null;
  nfts?: number | null;
  totalVaults?: number | null;
  tvlUsd?: number | null;
};

export function AppShell({ children, active, stats }: { children: React.ReactNode; active: string; stats?: AppShellStats }) {
  return (
    <div className="phew-app-bg min-h-screen bg-vault-radial text-white">
      <Sidebar active={active} stats={stats} />
      <div className="relative min-h-screen lg:pl-56">
        <TopBar />
        <main className="mx-auto w-full max-w-none px-3 py-3 sm:px-3 lg:px-3">{children}</main>
      </div>
    </div>
  );
}
