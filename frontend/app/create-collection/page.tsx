import type { LucideIcon } from "lucide-react";
import { Palette, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { getCollection } from "@/lib/mock-data";

export default function CreateCollectionPage() {
  const preview = getCollection();

  return (
    <AppShell active="create">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">Create Collection</p>
            <h1 className="mt-2 text-4xl font-black">Launch a token-specific VaultX community.</h1>
            <p className="mt-2 max-w-2xl text-slate-400">One token mint can create exactly one collection profile. Creators must hold the minimum token balance or pay the creation fee.</p>
          </div>

          <SectionCard title="Collection Profile">
            <form className="grid gap-5 lg:grid-cols-2">
              <Field label="Token mint" value={preview.tokenMint} />
              <Field label="Creator wallet" value="9x...7Q3e" />
              <Field label="Theme" value="Arcane swamp citadel" />
              <Field label="Mascot" value={preview.mascot} />
              <label className="block lg:col-span-2">
                <span className="text-sm text-slate-400">Vibe</span>
                <textarea className="mt-2 min-h-28 w-full rounded-lg border border-vault-line bg-black/25 px-4 py-3 text-sm outline-none focus:border-vault-purple" defaultValue={preview.vibe} />
              </label>
              <button className="h-12 rounded-lg bg-vault-purple font-bold shadow-glow lg:col-span-2">Create Collection Profile</button>
            </form>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard title="Eligibility">
              <div className="space-y-3 text-sm">
                <Check label="Minimum token balance" />
                <Check label="Creation fee fallback" />
                <Check label="Mint not previously used" />
                <Check label="Risk gate completed" />
              </div>
            </SectionCard>
            <SectionCard title="Identity Engine">
              <div className="space-y-3">
                {preview.communityTraits.slice(0, 4).map((trait) => (
                  <StatusPill key={trait} accent="green">{trait}</StatusPill>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Fee Vault">
              <p className="text-sm text-slate-400">Fees are isolated per collection and split into raid rewards, buyback/backing, treasury, creator, and safety reserve.</p>
              <ProgressBar value={35} color="purple" label="Raid allocation" />
            </SectionCard>
          </div>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Generated Preview">
            <img src={preview.image} alt="" className="aspect-square w-full rounded-lg object-cover shadow-glow" />
            <h2 className="mt-4 text-2xl font-black">{preview.name}</h2>
            <p className="mt-2 text-slate-400">{preview.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill accent="purple">{preview.theme}</StatusPill>
              <StatusPill accent="green">{preview.mascot}</StatusPill>
            </div>
          </SectionCard>
          <SectionCard title="Art Generator">
            <div className="grid gap-3">
              <Step icon={Palette} label="Generate palette" />
              <Step icon={Sparkles} label="Create trait rarity table" />
              <Step icon={Upload} label="Upload image and metadata" />
              <Step icon={ShieldCheck} label="Bind verified collection" />
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <input className="mt-2 h-12 w-full rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple" defaultValue={value} />
    </label>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/20 p-3">
      <ShieldCheck className="size-4 text-vault-green" />
      <span>{label}</span>
    </div>
  );
}

function Step({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
      <Icon className="size-5 text-vault-purple" />
      <span>{label}</span>
    </div>
  );
}
