"use client";

import Link from "next/link";
import {
  Bell,
  Boxes,
  Coins,
  FileSearch,
  Home,
  LockKeyhole,
  Medal,
  PlusCircle,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Swords,
  Trophy,
  Undo2,
  Users,
  WalletCards,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWalletDisplay } from "@/hooks/useWalletDisplay";
import { BrandLogo } from "./BrandLogo";
import { brandAssets } from "@/lib/brand-assets";
import { PhewProtocolIcon, type PhewProtocolIconName } from "./PhewProtocolIcon";

const navSections = [
  {
    title: "Main",
    items: [
      { href: "/home", label: "Home", icon: Home, protocolIcon: "reserve" as PhewProtocolIconName, key: "home" },
      { href: "/collections", label: "Collections", icon: Boxes, protocolIcon: "community" as PhewProtocolIconName, key: "collections" },
      { href: "/mint", label: "Mint", icon: LockKeyhole, protocolIcon: "mintNft" as PhewProtocolIconName, key: "mint" },
      { href: "/staking", label: "Staking", icon: Coins, protocolIcon: "stake" as PhewProtocolIconName, key: "staking" },
      { href: "/redeem", label: "Redeem", icon: Undo2, protocolIcon: "redeem" as PhewProtocolIconName, key: "redeem" },
      { href: "/proof", label: "Proof", icon: FileSearch, protocolIcon: "proof" as PhewProtocolIconName, key: "proof" }
    ]
  },
  {
    title: "Protocol",
    items: [
      { href: "/my-vaults", label: "My Vaults", icon: Users, protocolIcon: "lockTokens" as PhewProtocolIconName, key: "my-vaults" },
      { href: "/marketplace", label: "Marketplace", icon: WalletCards, asset: brandAssets.energyBeam, key: "marketplace" },
      { href: "/raids", label: "Raids", icon: Swords, protocolIcon: "raid" as PhewProtocolIconName, key: "raids" },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy, asset: brandAssets.rewardBurst, key: "leaderboard" },
      { href: "/create-community", label: "Create Community", icon: PlusCircle, protocolIcon: "community" as PhewProtocolIconName, key: "create-community" },
      { href: "/studio", label: "Studio", icon: PlusCircle, asset: brandAssets.energyBeam, key: "studio", badge: "New" }
    ]
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/setup", label: "Setup", icon: SlidersHorizontal, protocolIcon: "proof" as PhewProtocolIconName, key: "setup" },
      { href: "/admin/risk", label: "Risk", icon: ShieldAlert, asset: brandAssets.errorGlitch, key: "risk" },
      { href: "/strategy-engine", label: "Strategy", icon: Zap, protocolIcon: "strategy" as PhewProtocolIconName, key: "strategy-engine" }
    ]
  }
];

type SidebarStats = {
  collections?: number | null;
  nfts?: number | null;
  totalVaults?: number | null;
  tvlUsd?: number | null;
};

export function Sidebar({ active, stats }: { active: string; stats?: SidebarStats }) {
  const wallet = useWalletDisplay();
  const communities = typeof stats?.collections === "number" ? stats.collections.toLocaleString() : "N/A";
  const totalVaults = typeof stats?.totalVaults === "number" ? stats.totalVaults.toLocaleString() : typeof stats?.nfts === "number" ? stats.nfts.toLocaleString() : "N/A";
  const tvl = typeof stats?.tvlUsd === "number" ? `$${stats.tvlUsd.toLocaleString()}` : "N/A";

  return (
    <aside className="phew-sidebar fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-white/10 bg-[#020806]/96 shadow-[18px_0_60px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col">
        <Link href="/home" className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <BrandLogo />
        </Link>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className="px-2 text-[10px] font-black uppercase text-slate-500">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const asset = "asset" in item ? item.asset : null;
                  const protocolIcon = "protocolIcon" in item ? item.protocolIcon : null;
                  const selected = active === item.key;
                  return (
                    <Link
                      key={`${section.title ?? "main"}-${item.href}-${item.key}`}
                      href={item.href}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-[13px] font-bold text-slate-400 transition hover:border-vault-cyan/20 hover:bg-vault-cyan/5 hover:text-white",
                        selected && "border-vault-green/45 bg-vault-green/12 text-white shadow-[0_0_18px_rgba(186,255,0,0.12)]"
                      )}
                    >
                      {selected ? <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r bg-vault-green shadow-green" /> : null}
                      {protocolIcon ? <PhewProtocolIcon name={protocolIcon} className={cn("size-5 shrink-0 transition group-hover:scale-110", selected ? "drop-shadow-[0_0_10px_rgba(186,255,0,0.65)]" : "opacity-75")} /> : asset ? <img src={asset} alt="" className={cn("size-5 shrink-0 object-contain transition group-hover:scale-110", selected ? "drop-shadow-[0_0_10px_rgba(186,255,0,0.65)]" : "opacity-70")} /> : <Icon className={cn("size-4 transition group-hover:text-vault-green", selected ? "text-vault-green" : "text-slate-500")} />}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {"badge" in item && item.badge ? <span className="rounded border border-vault-green/35 bg-vault-green/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-vault-green">{item.badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 p-3">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/35 p-3">
            <div className="absolute inset-0 bg-gradient-to-br from-vault-green/8 via-transparent to-vault-cyan/8" />
            <p className="relative text-xs font-black uppercase text-slate-400">Wallet</p>
            <div className="relative mt-3 flex items-center gap-3 rounded-md border border-white/10 bg-black/35 p-3">
              <div className="flex size-10 items-center justify-center rounded-md border border-vault-green/25 bg-vault-green/10 text-vault-green shadow-green">
                <img src={brandAssets.tokenObject} alt="" className="size-5 object-contain" />
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate">{wallet.connected ? wallet.label : "Wallet disconnected"}</p>
                <p className="truncate text-slate-400">{wallet.connected && wallet.balanceSol !== null ? `${wallet.balanceSol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL` : wallet.connected ? "Balance N/A" : "Connect to view balance"}</p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-vault-green/20 bg-black/40 p-3">
            <p className="relative text-xs font-black uppercase text-slate-400">Protocol Stats</p>
            <div className="relative mt-3 grid grid-cols-3 gap-2 text-sm">
              <SidebarMetric label="TVL" value={tvl} />
              <SidebarMetric label="Vaults" value={totalVaults} />
              <SidebarMetric label="Factions" value={communities} />
            </div>
            <Link href="/create-community" className="phew-button phew-button-primary relative mt-4 flex h-10 items-center justify-center rounded-md text-sm font-black text-black">
              Launch
            </Link>
          </div>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-4 py-3 text-slate-500">
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
    <div className="min-w-0 rounded-md border border-white/5 bg-white/[0.03] p-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-white">{value}</p>
    </div>
  );
}
