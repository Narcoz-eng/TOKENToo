"use client";

import Link from "next/link";
import { Bell, ChevronDown, Command, RadioTower, Search, ShieldCheck } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { useWalletDisplay } from "@/hooks/useWalletDisplay";

export function TopBar() {
  const wallet = useWalletDisplay();

  return (
    <header className="sticky top-0 z-20 border-b border-vault-cyan/15 bg-[#020806]/90 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <label className="relative block max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-vault-green" />
            <input
              className="phew-input h-11 w-full rounded-md border-vault-cyan/20 bg-black/40 pl-12 pr-14 text-sm text-white"
              placeholder="Search collections, tokens, wallets..."
            />
            <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-vault-line bg-black/45 px-2 py-1 text-xs text-slate-400">
              <Command className="size-3" /> K
            </span>
          </label>
        </div>
        <div className="hidden h-11 items-center gap-2 rounded-md border border-vault-green/30 bg-vault-green/10 px-3 text-xs font-black text-vault-green md:flex">
          <RadioTower className="size-4" />
          DEVNET LIVE
        </div>
        <WalletButton />
        <button className="relative hidden size-11 place-items-center rounded-md border border-vault-line bg-black/35 text-slate-300 transition hover:border-vault-green/50 hover:text-vault-green sm:grid" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-vault-green shadow-green" />
        </button>
        <Link href="/profile" className="hidden h-11 items-center gap-3 rounded-md border border-vault-line bg-black/35 px-2 pr-3 sm:flex">
          <span className="grid size-8 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10 text-vault-green">
            <ShieldCheck className="size-4" />
          </span>
          <div className="text-sm">
            <p className="font-semibold">{wallet.connected ? wallet.label : "Profile"}</p>
            <p className="text-xs text-vault-green">{wallet.connected ? "Wallet connected" : "Connect wallet"}</p>
          </div>
          <ChevronDown className="size-4 text-slate-400" />
        </Link>
      </div>
    </header>
  );
}
