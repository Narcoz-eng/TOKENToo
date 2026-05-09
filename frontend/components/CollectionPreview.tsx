import { BadgeCheck, Crown, Gem, Layers3, LockKeyhole, Palette, ShieldCheck, Sparkles, Swords } from "lucide-react";
import type { CollectionGeneratorPreview } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";
import { ChestOpenAnimation, MintRevealAnimation, RewardBurstAnimation } from "./animations";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function CollectionPreview({ preview, compact = false }: { preview: CollectionGeneratorPreview; compact?: boolean }) {
  const samples = preview.samples.length ? preview.samples : fallbackSamples();

  return (
    <div className="space-y-5">
      <SectionCard title={compact ? "Review Preview" : "Collection Detail Preview"} className="overflow-hidden p-0">
        <div className="relative min-h-[420px]">
          <img src={safeImage(preview.banner, brandAssets.launchHero)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/90 to-[#020806]/35" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020806] to-transparent" />
          <div className="relative p-6 lg:p-7">
            <div className="grid gap-6 lg:grid-cols-[128px_minmax(0,1fr)_300px]">
              <img src={safeImage(preview.avatar, brandAssets.factionMark)} alt={preview.collection} className="aspect-square rounded-lg border border-vault-green/40 object-cover shadow-green" />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <StatusPill accent={preview.quality.tier === "Wireframe concept" || preview.quality.tier === "AI concept" || preview.quality.tier === "Basic" ? "gold" : "green"}>{preview.quality.tier}</StatusPill>
                  <StatusPill accent="cyan">{preview.theme}</StatusPill>
                  <StatusPill accent={isProductionStatus(preview.productionAssetStatus) ? "green" : "gold"}>{previewStatusLabel(preview)}</StatusPill>
                </div>
                <h2 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">{preview.collection}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{preview.lore}</p>
                {!preview.finalProductionReady ? (
                  <p className="mt-3 max-w-3xl rounded-md border border-vault-gold/35 bg-vault-gold/10 px-3 py-2 text-xs font-bold leading-5 text-vault-gold">
                    {preview.productionAssetStatus === "AI_CONCEPT"
                      ? "AI concept preview - creator review only. Final minting requires curated or artist-approved layer packs."
                      : "Wireframe only — enable OpenAI image generation or curated asset provider for professional NFT previews."}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Overview", "Vault NFTs", "Staking", "Raids", "Traits"].map((tab, index) => (
                    <span key={tab} className={cn("rounded-md border px-3 py-2 text-xs font-bold", index === 0 ? "border-vault-green bg-vault-green/12 text-vault-green" : "border-vault-line bg-black/30 text-slate-400")}>{tab}</span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <PreviewMetric label="Vault supply" value="10,000" />
                <PreviewMetric label="Trait layers" value={String(Object.keys(preview.traitCounts).length || 5)} />
                <PreviewMetric label="Readiness" value={assetStatusLabel(preview.productionAssetStatus)} />
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <FeatureTile icon={LockKeyhole} title="Vault NFTs" body="Token-backed identity cards with redeem and marketplace hooks." />
              <FeatureTile icon={Swords} title="Raid Rooms" body={preview.raidTheme || "Faction raids activate after launch."} />
              <FeatureTile icon={Sparkles} title="Staking" body="Reward hooks and role progression are ready for collection rules." />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Vault NFT Preview Set">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {samples.slice(0, compact ? 3 : 6).map((sample, index) => (
            <PreviewNftCard key={sample.id} sample={sample} index={index} />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title="Launch Review">
          <div className="grid gap-3 md:grid-cols-2">
            <ReviewItem icon={BadgeCheck} label="Brand kit" value={preview.preset || "PHEW curated"} />
            <ReviewItem icon={Palette} label="Visual system" value={preview.artStyle} />
            <ReviewItem icon={Layers3} label="Trait depth" value={`${Object.values(preview.traitCounts).reduce((sum, value) => sum + Number(value), 0)} traits`} />
            <ReviewItem icon={ShieldCheck} label="Quality" value={`${preview.quality.previewQualityScore}% preview score`} />
          </div>
          <div className="mt-4 grid gap-2">
            {preview.traitLanguage.slice(0, 8).map((trait) => (
              <span key={trait} className="rounded-md border border-vault-cyan/20 bg-vault-cyan/8 px-3 py-2 text-xs font-bold text-vault-cyan">{trait}</span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Rarity Table">
          <div className="space-y-4">
            {Object.entries(preview.rarityWeights).slice(0, 5).map(([rarity, weight]) => (
              <div key={rarity}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-bold text-slate-200">{rarity}</span>
                  <span className={rarity === "Legendary" || rarity === "Mythic" ? "text-vault-gold" : "text-vault-green"}>{formatWeight(weight)}</span>
                </div>
                <ProgressBar value={Number(weight)} max={10000} color={rarity === "Legendary" || rarity === "Mythic" ? "gold" : rarity === "Epic" ? "purple" : "green"} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {!compact ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <SectionCard title="Mint Motion">
            <MintRevealAnimation rarity="Epic" label="Mint Vault" />
          </SectionCard>
          <SectionCard title="Stake Motion">
            <RewardBurstAnimation rarity="Rare" label="Stake Rewards" />
          </SectionCard>
          <SectionCard title="Raid Motion">
            <ChestOpenAnimation rarity="Legendary" label="Raid Chest" />
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

function PreviewNftCard({ sample, index }: { sample: CollectionGeneratorPreview["samples"][number]; index: number }) {
  const rarityAccent = sample.rarity === "Legendary" || sample.rarity === "Mythic" ? "gold" : sample.rarity === "Epic" ? "cyan" : "green";
  return (
    <article className="phew-card-hover overflow-hidden rounded-lg border border-vault-line bg-black/35">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img src={safeImage(sample.image, brandAssets.nftVaults[index % brandAssets.nftVaults.length])} alt={sample.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />
        <div className="absolute left-3 top-3">
          <StatusPill accent={rarityAccent}>{sample.rarity}</StatusPill>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-sm font-black text-white">{sample.name}</p>
          <p className="mt-1 text-xs font-bold text-vault-green">{sample.role}</p>
        </div>
      </div>
      <div className="grid gap-2 p-3">
        {sample.traits.slice(0, 2).map((trait) => (
          <span key={trait} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">{trait}</span>
        ))}
      </div>
    </article>
  );
}

function FeatureTile({ icon: Icon, title, body }: { icon: typeof LockKeyhole; title: string; body: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/35 p-4">
      <Icon className="mb-3 size-6 text-vault-green" />
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </div>
  );
}

function ReviewItem({ icon: Icon, label, value }: { icon: typeof BadgeCheck; label: string; value: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/25 p-4">
      <Icon className="mb-3 size-5 text-vault-green" />
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/40 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function fallbackSamples(): CollectionGeneratorPreview["samples"] {
  return brandAssets.nftVaults.map((image, index) => ({
    id: `fallback-${index}`,
    name: [`Vault Relic #001`, `Vault Key #014`, `Founder Crown #077`][index],
    image,
    rarity: ["Rare", "Epic", "Legendary"][index],
    role: ["Vault Raider", "Key Bearer", "Founder Guard"][index],
    traits: [["Lime core", "Obsidian frame"], ["Cyan charge", "Key relic"], ["Gold seal", "Legendary crown"]][index]
  }));
}

function safeImage(src: string | undefined | null, fallback: string) {
  if (!src) return fallback;
  const value = src.toLowerCase();
  if (value.includes("placeholder") || value.includes("smiley") || value.includes("pink")) return fallback;
  return src;
}

function previewStatusLabel(preview: CollectionGeneratorPreview) {
  if (preview.productionAssetStatus === "WIREFRAME" || preview.previewClassification === "WIREFRAME_CONCEPT") return "Wireframe preview only";
  if (preview.productionAssetStatus === "AI_CONCEPT" || preview.previewClassification === "AI_CONCEPT_PREVIEW") return "AI concept preview";
  if (preview.productionAssetStatus === "FINAL_PRODUCTION") return "Final production assets";
  if (preview.productionAssetStatus === "ARTIST_APPROVED") return "Artist approved assets";
  if (preview.productionAssetStatus === "CURATED_LAYER_READY") return "Curated layer ready";
  return "Concept preview";
}

function isProductionStatus(status: CollectionGeneratorPreview["productionAssetStatus"]) {
  return status === "CURATED_LAYER_READY" || status === "ARTIST_APPROVED" || status === "FINAL_PRODUCTION";
}

function assetStatusLabel(status: CollectionGeneratorPreview["productionAssetStatus"]) {
  if (status === "FINAL_PRODUCTION") return "Final";
  if (status === "ARTIST_APPROVED") return "Artist approved";
  if (status === "CURATED_LAYER_READY") return "Curated layers";
  if (status === "AI_CONCEPT") return "AI concept";
  return "Wireframe";
}

function formatWeight(value: number) {
  if (value > 100) return `${(value / 100).toFixed(value % 100 === 0 ? 0 : 1)}%`;
  return `${value}%`;
}
