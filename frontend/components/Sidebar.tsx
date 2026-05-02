import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  Coins,
  Home,
  LockKeyhole,
  Medal,
  PlusCircle,
  Search,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
  WalletCards,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home, key: "home" },
  { href: "/collections", label: "Collections", icon: Boxes, key: "collections" },
  { href: "/raids", label: "Raids", icon: Swords, key: "raids" },
  { href: "/staking", label: "Staking", icon: Coins, key: "staking" },
  { href: "/marketplace", label: "Marketplace", icon: WalletCards, key: "marketplace" },
  { href: "/profile", label: "Profile", icon: Users, key: "profile" },
  { href: "/mint", label: "Mint Vault", icon: LockKeyhole, key: "mint" },
  { href: "/instant-sell", label: "Instant Sell", icon: Zap, key: "instant-sell" },
  { href: "/create-collection", label: "Create Collection", icon: PlusCircle, key: "create" },
  { href: "/admin/risk", label: "Risk Admin", icon: ShieldAlert, key: "risk" }
];

export function Sidebar({ active }: { active: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-vault-line bg-[#050912]/95 lg:block">
      <div className="flex h-full flex-col">
        <Link href="/home" className="flex h-20 items-center gap-3 border-b border-vault-line px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-vault-purple/20 text-vault-purple">
            <ShieldLogo />
          </div>
          <span className="text-2xl font-black tracking-normal">VAULT<span className="text-vault-purple">X</span></span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white",
                  selected && "bg-vault-purple/25 text-white neon-border"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                {item.label === "Profile" ? <span className="ml-auto rounded-md bg-vault-purple px-2 py-0.5 text-xs text-white">OG</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 p-4">
          <div className="glass rounded-lg p-3">
            <p className="text-xs uppercase text-slate-400">Your Wallet</p>
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-vault-line bg-black/25 p-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-vault-green to-vault-purple">
                <Coins className="size-5 text-white" />
              </div>
              <div className="text-sm">
                <p>9x...7Q3e</p>
                <p className="text-slate-400">12.45 SOL</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-xs uppercase text-slate-400">Platform Stats</p>
            <div className="mt-3 space-y-3 text-sm">
              <SidebarMetric label="Total Value Locked" value="$18,420,693" />
              <SidebarMetric label="Total Vaults" value="4,523" />
              <SidebarMetric label="Communities" value="128" />
            </div>
            <Link href="/admin/risk" className="mt-4 flex h-10 items-center justify-center rounded-lg bg-vault-purple text-sm font-semibold">
              View Analytics
            </Link>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-vault-line bg-black/20 px-4 py-3 text-slate-400">
            <Bell className="size-4" />
            <Search className="size-4" />
            <Trophy className="size-4" />
            <Medal className="size-4" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-bold text-white">{value}</p>
      <p className="text-xs font-semibold text-vault-green">+24.8%</p>
    </div>
  );
}

function ShieldLogo() {
  return (
    <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
      <path fill="currentColor" d="M16 3 29 8v6c0 8-5.4 13.1-13 15C8.4 27.1 3 22 3 14V8l13-5Z" />
      <path fill="#21f26b" d="m8 10 8 4 8-4v4l-8 4-8-4v-4Z" />
    </svg>
  );
}

