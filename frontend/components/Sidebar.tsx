"use client";

import Link from "next/link";
import Image from "next/image";
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-vault-line bg-[#050912]/95 lg:block">
      <div className="flex h-full flex-col">
        <Link href="/home" className="flex h-20 items-center gap-3 border-b border-vault-line px-6">
          <Image src="/brand/phew-run-logo.svg" alt="Phew.run" width={136} height={46} className="h-12 w-auto object-contain" priority />
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
              <div className="min-w-0 text-sm">
                <p className="truncate">{wallet.connected ? wallet.label : "Wallet disconnected"}</p>
                <p className="text-slate-400">{wallet.connected && wallet.balanceSol !== null ? `${wallet.balanceSol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL` : wallet.connected ? "Balance unavailable" : "Connect wallet to view balance"}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-xs uppercase text-slate-400">Platform Stats</p>
            <div className="mt-3 space-y-3 text-sm">
              <SidebarMetric label="Total Value Locked" value={tvl} />
              <SidebarMetric label="Total Vaults" value={totalVaults} />
              <SidebarMetric label="Communities" value={communities} />
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
    </div>
  );
}
