import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ActionCard({ href, icon: Icon, title, body }: { href: string; icon: LucideIcon; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-md border border-vault-line bg-black/35 p-4 transition hover:-translate-y-0.5 hover:border-vault-green/60 hover:bg-vault-green/10 hover:shadow-green">
      <Icon className="size-6 text-vault-green transition group-hover:scale-110" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </Link>
  );
}
