import Link from "next/link";
import { Bell, ChevronDown, Command, Search } from "lucide-react";
import { WalletButton } from "./WalletButton";

const topNav = [
  { href: "/collections", label: "Explore" },
  { href: "/collections", label: "Collections" },
  { href: "/raids", label: "Raids" },
  { href: "/staking", label: "Staking" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/profile", label: "Rewards" }
];

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-vault-line bg-[#050912]/90 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="hidden min-w-0 flex-1 md:block">
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-lg border border-vault-line bg-black/35 pl-12 pr-14 text-sm text-white outline-none transition focus:border-vault-purple"
              placeholder="Search collections, tokens, users..."
            />
            <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">
              <Command className="size-3" /> K
            </span>
          </label>
        </div>

        <nav className="hidden items-center gap-2 xl:flex">
          {topNav.map((item) => (
            <Link key={item.href + item.label} href={item.href} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/create-collection" className="hidden h-10 items-center rounded-lg bg-vault-purple px-4 text-sm font-semibold text-white shadow-glow sm:flex">
          Create Collection
        </Link>
        <WalletButton />
        <button className="relative hidden size-10 place-items-center rounded-lg border border-vault-line bg-black/25 text-slate-300 sm:grid" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-vault-red" />
        </button>
        <Link href="/profile" className="hidden items-center gap-3 sm:flex">
          <img src="/art/frog-vault.png" alt="FrogMaster avatar" className="size-10 rounded-full border border-vault-purple object-cover" />
          <div className="text-sm">
            <p className="font-semibold">FrogMaster</p>
            <p className="text-xs text-vault-purple">OG Raider</p>
          </div>
          <ChevronDown className="size-4 text-slate-400" />
        </Link>
      </div>
    </header>
  );
}

