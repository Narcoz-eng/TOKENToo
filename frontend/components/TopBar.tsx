"use client";

import Link from "next/link";
import { Bell, ChevronDown, Command, RadioTower, Search } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { useWalletDisplay } from "@/hooks/useWalletDisplay";

export function TopBar() {
  const wallet = useWalletDisplay();

  return (
    <header className="sticky top-0 z-20 border-b border-vault-line bg-[#020806]/86 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-vault-green" />
            <input
              className="phew-input h-12 w-full rounded-md pl-12 pr-14 text-sm text-white"
              placeholder="Search factions, vaults, raids..."
            />
            <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-vault-line bg-black/45 px-2 py-1 text-xs text-slate-400">
              <Command className="size-3" /> K
            </span>
          </label>
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-vault-green/30 bg-vault-green/10 px-3 py-2 text-xs font-black text-vault-green md:flex">
          <RadioTower className="size-4" />
          DEVNET LIVE
        </div>
        <WalletButton />
        <button className="relative hidden size-10 place-items-center rounded-md border border-vault-line bg-black/30 text-slate-300 transition hover:border-vault-green/50 hover:text-vault-green sm:grid" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-vault-green shadow-green" />
        </button>
        <Link href="/profile" className="hidden items-center gap-3 sm:flex">
          <img src="/brand/phew-run-logo.svg" alt="Phew.run" className="size-10 rounded-md border border-vault-green/40 bg-black/30 object-cover p-1" />
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
