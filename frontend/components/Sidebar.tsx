"use client";

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
import { useWalletDisplay } from "@/hooks/useWalletDisplay";
import { BrandLogo } from "./BrandLogo";

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

type SidebarStats = {
  collections?: number | null;
  nfts?: number | null;
  totalVaults?: number | null;
  tvlUsd?: number | null;
};

export function Sidebar({ active, stats }: { active: string; stats?: SidebarStats }) {
  const wallet = useWalletDisplay();
  const communities = typeof stats?.collections === "number" ? stats.collections.toLocaleString() : "0";
  const totalVaults = typeof stats?.totalVaults === "number" ? stats.totalVaults.toLocaleString() : typeof stats?.nfts === "number" ? stats.nfts.toLocaleString() : "—";
  const tvl = typeof stats?.tvlUsd === "number" ? `$${stats.tvlUsd.toLocaleString()}` : "—";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-vault-line bg-[#020806]/95 shadow-[18px_0_50px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col">
        <Link href="/home" className="flex h-20 items-center gap-3 border-b border-vault-line px-6">
          <BrandLogo />
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
                  "group flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-sm font-semibold text-slate-400 transition hover:border-vault-cyan/25 hover:bg-vault-cyan/5 hover:text-white",
                  selected && "neon-border border-vault-green/30 bg-vault-green/10 text-white"
                )}
              >
                <Icon className={cn("size-4 transition group-hover:text-vault-green", selected ? "text-vault-green" : "text-slate-500")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 p-4">
          <div className="phew-panel relative rounded-lg p-3">
            <p className="relative text-xs font-black uppercase text-slate-400">Wallet Relay</p>
            <div className="relative mt-3 flex items-center gap-3 rounded-md border border-vault-line bg-black/30 p-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-vault-green/10 text-vault-green shadow-green">
                <Coins className="size-5" />
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate">{wallet.connected ? wallet.label : "Wallet disconnected"}</p>
                <p className="text-slate-400">{wallet.connected && wallet.balanceSol !== null ? `${wallet.balanceSol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL` : wallet.connected ? "Balance unavailable" : "Connect wallet to view balance"}</p>
              </div>
            </div>
          </div>
          <div className="phew-panel relative rounded-lg p-3">
            <p className="relative text-xs font-black uppercase text-slate-400">Faction Stats</p>
            <div className="relative mt-3 space-y-3 text-sm">
              <SidebarMetric label="Total Value Locked" value={tvl} />
              <SidebarMetric label="Total Vaults" value={totalVaults} />
              <SidebarMetric label="Communities" value={communities} />
            </div>
            <Link href="/admin/risk" className="phew-button phew-button-primary relative mt-4 flex h-10 items-center justify-center rounded-md text-sm font-black text-black">
              Analytics
            </Link>
          </div>
          <div className="flex items-center justify-between rounded-md border border-vault-line bg-black/25 px-4 py-3 text-slate-500">
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
    </div>
  );
}
