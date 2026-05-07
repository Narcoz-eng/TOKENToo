import { AlertTriangle, BadgeCheck, Crown, Gem, Palette, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import type { CollectionGeneratorPreview } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";
import { ChestOpenAnimation, LegendaryRevealAnimation, MintRevealAnimation } from "./animations";
import { brandAssets } from "@/lib/brand-assets";

export function CollectionPreview({ preview }: { preview: CollectionGeneratorPreview }) {
  return (
    <div className="space-y-5">
      <SectionCard title="Approval Preview">
        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div>
            <img src={preview.avatar || brandAssets.emptyVault} alt={preview.collection} className="aspect-square w-full rounded-lg object-cover shadow-glow" />
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill accent={preview.quality.tier === "Basic" ? "gold" : "purple"}>{preview.quality.tier}</StatusPill>
              <StatusPill accent={preview.quality.passed ? "green" : "red"}>{preview.quality.passed ? "Quality Passed" : "Needs Regen"}</StatusPill>
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative min-h-64 overflow-hidden rounded-lg border border-vault-line bg-black/25 p-5">
              <img src={preview.banner || brandAssets.vaultHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/80 to-transparent" />
              <div className="relative max-w-2xl">
                <p className="text-sm font-black uppercase text-vault-green">{preview.preset}</p>
                <h2 className="mt-2 text-4xl font-black">{preview.collection}</h2>
                <p className="mt-2 text-vault-green">{preview.mascot} / {preview.artStyle}</p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{preview.lore}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {preview.assetProvider ? <StatusPill accent={preview.finalProductionReady ? "green" : "gold"}>{preview.assetProvider}</StatusPill> : null}
                  <StatusPill accent={preview.finalProductionReady ? "green" : "gold"}>{preview.finalProductionReady ? "Production ready" : "Preview only"}</StatusPill>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Info icon={Palette} label="Theme" value={preview.theme} />
              <Info icon={Sparkles} label="World" value={preview.backgroundWorld} />
              <Info icon={ShieldCheck} label="Raid Theme" value={preview.raidTheme} />
            </div>
          </div>
        </div>
      </SectionCard>

      {preview.warnings?.length ? (
        <SectionCard title="Preview-Only Setup Warning">
          <div className="flex gap-3 rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
            <AlertTriangle className="size-5 shrink-0 text-vault-gold" />
            <div className="space-y-1">
              {preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="NFT Preview Set">
        <div className="grid gap-4 md:grid-cols-5">
          {preview.samples.map((sample) => (
            <article key={sample.id} className="overflow-hidden rounded-lg border border-vault-line bg-black/25">
              <div className="relative aspect-square">
                <img src={sample.image} alt={sample.name} className="h-full w-full object-cover" />
                <div className="absolute left-2 top-2">
                  <StatusPill accent={sample.rarity === "Legendary" || sample.rarity === "Mythic" ? "gold" : sample.rarity === "Epic" ? "purple" : "green"}>{sample.rarity}</StatusPill>
                </div>
              </div>
              <div className="p-3">
                <p className="font-bold">{sample.name}</p>
                <p className="mt-1 text-xs text-vault-purple">{sample.role}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sample.traits.slice(0, 2).map((trait) => (
                    <span key={trait} className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-300">{trait}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Trait Table">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(preview.traitCounts).map(([category, count]) => (
              <div key={category} className="rounded-lg border border-vault-line bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold capitalize">{category.replace(/([A-Z])/g, " $1")}</p>
                  <span className="text-vault-green">{count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {preview.traitLanguage.slice(0, 8).map((trait) => (
              <StatusPill key={trait} accent="purple">{trait}</StatusPill>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Rarity Table">
          <div className="space-y-3">
            {Object.entries(preview.rarityWeights).map(([rarity, weight]) => (
              <div key={rarity}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-300">{rarity}</span>
                  <span className="text-vault-green">{weight} bps</span>
                </div>
                <ProgressBar value={weight} max={10000} color={rarity === "Legendary" || rarity === "Mythic" ? "gold" : rarity === "Epic" ? "purple" : "green"} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Quality Gates">
          <Score label="Preview Quality" value={preview.quality.previewQualityScore} />
          <Score label="10k Uniqueness" value={preview.quality.uniquenessScore} />
          <Score label="Color Harmony" value={preview.quality.colorHarmonyScore} />
          <Score label="Duplicate Risk" value={preview.quality.duplicateRiskScore} />
          <Score label="Compatibility" value={preview.quality.compatibilityScore} />
          <div className="mt-4 rounded-lg border border-vault-green/30 bg-vault-green/10 p-3 text-sm text-vault-green">
            Only Premium and Legendary-ready collections can be featured on the homepage.
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Distinctiveness Score">
          <Score label="Silhouette" value={preview.distinctiveness.silhouetteUniqueness} />
          <Score label="Palette" value={preview.distinctiveness.paletteUniqueness} />
          <Score label="Mascot" value={preview.distinctiveness.mascotUniqueness} />
          <Score label="Background World" value={preview.distinctiveness.backgroundWorldUniqueness} />
          <Score label="Trait Language" value={preview.distinctiveness.traitLanguageUniqueness} />
        </SectionCard>

        <SectionCard title="10k Readiness">
          {preview.tenKReadiness ? (
            <div className="space-y-4">
              <StatusPill accent={preview.tenKReadiness.estimated10kFeasible ? "green" : "gold"}>{preview.tenKReadiness.estimated10kFeasible ? "10k feasible" : "Needs production review"}</StatusPill>
              <Score label="Visual Diversity" value={preview.tenKReadiness.visualDiversityScore} />
              <div className="rounded-lg border border-vault-line bg-black/25 p-3 text-sm">
                <p className="text-slate-400">Possible unique combinations</p>
                <p className="mt-1 font-bold text-white">{preview.tenKReadiness.possibleUniqueCombinations}</p>
              </div>
              <div className="rounded-lg border border-vault-line bg-black/25 p-3 text-sm">
                <p className="text-slate-400">Duplicate risk</p>
                <p className="mt-1 font-bold text-white">{preview.tenKReadiness.duplicateRisk}</p>
              </div>
              {preview.tenKReadiness.blockers.length ? (
                <div className="rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-3 text-sm text-slate-200">
                  {preview.tenKReadiness.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">10k readiness is available on preview-only generation responses.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Animation Direction">
        <div className="grid gap-4 md:grid-cols-3">
          <MintRevealAnimation rarity="Rare" label="Mint reveal" />
          <ChestOpenAnimation rarity="Epic" label="Chest open" />
          <LegendaryRevealAnimation rarity="Legendary" label="Legendary reveal" />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Approval Checklist">
          <div className="space-y-3 text-sm">
            {[
              ["Avatar and banner reviewed", BadgeCheck],
              ["5 NFT previews reviewed", Gem],
              ["Trait language is community-specific", Wand2],
              ["Legendary direction is visually obvious", Crown],
              ["Raid theme and role names approved", ShieldCheck]
            ].map(([label, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-lg bg-black/25 p-3">
                <Icon className="size-5 text-vault-green" />
                <span>{label as string}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Palette; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-3">
      <Icon className="mb-2 size-5 text-vault-purple" />
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className={value >= 80 ? "text-vault-green" : "text-vault-gold"}>{value}%</span>
      </div>
      <ProgressBar value={value} color={value >= 80 ? "green" : "purple"} />
    </div>
  );
}
