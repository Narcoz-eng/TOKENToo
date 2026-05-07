import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { brandAssets } from "@/lib/brand-assets";

export function ActionCard({ href, icon: Icon, title, body }: { href: string; icon: LucideIcon; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-md border border-vault-line bg-black/35 p-4 transition hover:-translate-y-0.5 hover:border-vault-green/60 hover:bg-vault-green/10 hover:shadow-green">
      <div className="flex items-center gap-3">
        <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-md border border-vault-green/25 bg-black/40">
          <img src={brandAssets.actionIcons} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <Icon className="relative size-5 text-vault-green transition group-hover:scale-110" />
        </span>
      </div>
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </Link>
  );
}
