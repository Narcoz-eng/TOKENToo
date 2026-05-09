import { BadgeCheck, Layers3, LockKeyhole, Palette, ShieldCheck, Sparkles, Swords, Wand2 } from "lucide-react";
import type { CollectionGeneratorPreview } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";
import { ChestOpenAnimation, MintRevealAnimation, RewardBurstAnimation } from "./animations";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function CollectionPreview({
  preview,
  compact = false,
  onGenerateAiConcept,
  canGenerateAiConcept = false,
  loading = false
}: {
  preview: CollectionGeneratorPreview;
  compact?: boolean;
  onGenerateAiConcept?: () => void;
  canGenerateAiConcept?: boolean;
  loading?: boolean;
}) {
  const samples = preview.samples;
  const wireframeOnly = isWireframePreview(preview);
  const aiConcept = preview.productionAssetStatus === "AI_CONCEPT" || preview.previewClassification === "AI_CONCEPT_PREVIEW";
  const professionalPreview = !wireframeOnly;
  const visualSamples = professionalPreview ? samples.filter((sample) => Boolean(sample.image)) : [];

  return (
    <div className="space-y-5">
      <SectionCard title={compact ? "Art Direction Review" : "Collection Art Direction"} className="overflow-hidden p-0">
        <div className="relative min-h-[420px]">
          {professionalPreview ? (
            <img src={safeImage(preview.banner, brandAssets.launchHero)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          ) : (
            <img src={brandAssets.emptyVaultPremium} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/90 to-[#020806]/35" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020806] to-transparent" />
          <div className="relative p-6 lg:p-7">
            <div className="grid gap-6 lg:grid-cols-[128px_minmax(0,1fr)_300px]">
              {professionalPreview ? (
                <img src={safeImage(preview.avatar, brandAssets.factionMark)} alt={preview.collection} className="aspect-square rounded-lg border border-vault-green/40 object-cover shadow-green" />
              ) : (
                <DnaMark preview={preview} />
              )}
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
                      : "Professional preview requires OpenAI image generation or an approved curated asset pack. Wireframes are hidden below as planning/debug assets only."}
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

            {wireframeOnly ? <ProfessionalPreviewGate preview={preview} onGenerateAiConcept={onGenerateAiConcept} canGenerateAiConcept={canGenerateAiConcept} loading={loading} /> : null}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <FeatureTile icon={LockKeyhole} title={wireframeOnly ? "Vault visuals pending" : "Vault NFTs"} body={wireframeOnly ? "Vault NFT visuals pending professional concept or curated layer pack." : "Token-backed identity cards with redeem and marketplace hooks."} />
              <FeatureTile icon={Swords} title="Raid Rooms" body={preview.raidTheme || "Faction raids activate after launch."} />
              <FeatureTile icon={Sparkles} title="Staking" body="Reward hooks and role progression are ready for collection rules." />
            </div>
          </div>
        </div>
      </SectionCard>

      {professionalPreview ? (
        <SectionCard title={aiConcept ? "AI Concept Preview" : "Vault NFT Preview Set"}>
          {aiConcept ? <p className="mb-4 rounded-md border border-vault-cyan/25 bg-vault-cyan/8 px-3 py-2 text-xs font-bold text-vault-cyan">AI concept preview - not mintable final art.</p> : null}
          {visualSamples.length ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {visualSamples.slice(0, compact ? 3 : 6).map((sample) => (
                <PreviewNftCard key={sample.id} sample={sample} />
              ))}
            </div>
          ) : (
            <PendingVaultVisuals />
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Professional Preview Required">
          <ProfessionalPreviewRequirement preview={preview} onGenerateAiConcept={onGenerateAiConcept} canGenerateAiConcept={canGenerateAiConcept} loading={loading} />
          <details className="mt-4 rounded-md border border-vault-line bg-black/30 p-4">
            <summary className="cursor-pointer text-sm font-black text-slate-300">Wireframe planning specs</summary>
            {samples.length ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {samples.slice(0, compact ? 3 : 6).map((sample, index) => (
                  <WireframeSpecCard key={sample.id} sample={sample} index={index} />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-slate-400">No wireframe specs are available for this preview.</p>
            )}
          </details>
        </SectionCard>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title="Launch Review">
          <div className="grid gap-3 md:grid-cols-2">
            <ReviewItem icon={BadgeCheck} label="Brand kit" value={preview.preset || "PHEW curated"} />
            <ReviewItem icon={Palette} label="Visual system" value={preview.artStyle} />
            <ReviewItem icon={Layers3} label="Trait depth" value={`${Object.values(preview.traitCounts).reduce((sum, value) => sum + Number(value), 0)} traits`} />
            <ReviewItem icon={ShieldCheck} label="Quality" value={wireframeOnly ? "Awaiting AI/curated art" : `${preview.quality.previewQualityScore}% preview score`} />
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

function ProfessionalPreviewGate({ preview, onGenerateAiConcept, canGenerateAiConcept, loading }: { preview: CollectionGeneratorPreview; onGenerateAiConcept?: () => void; canGenerateAiConcept: boolean; loading: boolean }) {
  const culture = preview.traitLanguage.slice(0, 5);
  return (
    <div className="mt-7 grid gap-4 rounded-lg border border-vault-cyan/25 bg-black/45 p-4 shadow-[0_0_60px_rgba(22,215,210,0.12)] md:grid-cols-[1.2fr_.8fr]">
      <div>
        <div className="flex items-center gap-2 text-vault-cyan">
          <Wand2 className="size-4" />
          <p className="text-xs font-black uppercase tracking-[0.18em]">Creative DNA Ready</p>
        </div>
        <p className="mt-3 text-2xl font-black leading-tight text-white">{preview.backgroundWorld}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{preview.mascot} needs AI concept art or curated production layers before the creator-facing visual preview is meaningful.</p>
        {onGenerateAiConcept ? (
          <button type="button" onClick={onGenerateAiConcept} disabled={!canGenerateAiConcept || loading} className="phew-button phew-button-primary mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-55">
            <Sparkles className="size-4" /> Generate AI Concept Preview
          </button>
        ) : null}
      </div>
      <div className="grid gap-2">
        {culture.map((item) => (
          <span key={item} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200">{item}</span>
        ))}
      </div>
    </div>
  );
}

function ProfessionalPreviewRequirement({ preview, onGenerateAiConcept, canGenerateAiConcept, loading }: { preview: CollectionGeneratorPreview; onGenerateAiConcept?: () => void; canGenerateAiConcept: boolean; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-vault-gold/30 bg-vault-gold/8 p-5">
          <p className="text-sm font-black uppercase text-vault-gold">Creative DNA ready</p>
          <h3 className="mt-2 text-2xl font-black text-white">Professional concept preview required</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">The generator produced identity, rarity logic, trait taxonomy, and production rules. It is intentionally not presenting SVG wireframes as collection art.</p>
          {onGenerateAiConcept ? (
            <button type="button" onClick={onGenerateAiConcept} disabled={!canGenerateAiConcept || loading} className="phew-button phew-button-primary mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-55">
              <Sparkles className="size-4" /> Generate AI Concept Preview
            </button>
          ) : null}
        </div>
        <div className="rounded-lg border border-vault-line bg-black/35 p-5">
          <p className="text-xs uppercase text-slate-500">Production path</p>
          <div className="mt-3 space-y-2 text-sm font-bold text-slate-200">
            <p>AI concept preview</p>
            <p>Curated deterministic mint layers</p>
            <p>Final production assets</p>
          </div>
        </div>
      </div>
      <DnaSummaryGrid preview={preview} />
    </div>
  );
}

function DnaSummaryGrid({ preview }: { preview: CollectionGeneratorPreview }) {
  const rarity = Object.entries(preview.rarityWeights).slice(0, 4).map(([name, value]) => `${name} ${formatWeight(value)}`).join(" / ");
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard title="Identity" body={`${preview.collection} / ${preview.mascot}`} />
      <SummaryCard title="Mood culture" body={preview.traitLanguage.slice(0, 3).join(", ") || preview.theme} />
      <SummaryCard title="Rarity plan" body={rarity || "Rarity ladder ready"} />
      <SummaryCard title="Trait taxonomy" body={`${Object.keys(preview.traitCounts).length || 0} categories mapped`} />
    </div>
  );
}

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/25 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-bold leading-5 text-slate-200">{body}</p>
    </div>
  );
}

function DnaMark({ preview }: { preview: CollectionGeneratorPreview }) {
  const initials = (preview.collection.replace(/^\$/, "").match(/\b[A-Za-z0-9]/g) ?? ["D", "N", "A"]).slice(0, 3).join("");
  return (
    <div className="grid aspect-square place-items-center rounded-lg border border-vault-cyan/35 bg-black/55 shadow-[0_0_40px_rgba(22,215,210,0.18)]">
      <div className="text-center">
        <p className="text-3xl font-black text-vault-cyan">{initials}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">DNA</p>
      </div>
    </div>
  );
}

function PreviewNftCard({ sample }: { sample: CollectionGeneratorPreview["samples"][number] }) {
  const rarityAccent = sample.rarity === "Legendary" || sample.rarity === "Mythic" ? "gold" : sample.rarity === "Epic" ? "cyan" : "green";
  return (
    <article className="phew-card-hover overflow-hidden rounded-lg border border-vault-line bg-black/35">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img src={sample.image} alt={sample.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
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

function WireframeSpecCard({ sample, index }: { sample: CollectionGeneratorPreview["samples"][number]; index: number }) {
  return (
    <article className="rounded-md border border-dashed border-vault-gold/30 bg-vault-gold/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-200">Planning spec {String(index + 1).padStart(2, "0")}</p>
        <StatusPill accent="gold">Wireframe</StatusPill>
      </div>
      <p className="mt-2 text-xs font-bold text-vault-gold">{sample.rarity} / not collection art</p>
      <div className="mt-3 grid gap-2">
        {sample.traits.slice(0, 4).map((trait) => (
          <span key={trait} className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-slate-300">{trait}</span>
        ))}
      </div>
      <p className="mt-3 break-words font-mono text-[10px] text-slate-500">{shortSpec(sample.image)}</p>
    </article>
  );
}

function PendingVaultVisuals() {
  return (
    <div className="rounded-lg border border-dashed border-vault-line bg-black/25 p-6 text-center">
      <p className="font-black text-white">Vault NFT visuals pending professional concept or curated layer pack.</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">No placeholder or wireframe artwork is shown as collection art.</p>
    </div>
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

function safeImage(src: string | undefined | null, fallback: string) {
  if (!src) return fallback;
  const value = src.toLowerCase();
  if (value.includes("placeholder") || value.includes("smiley") || value.includes("pink")) return fallback;
  return src;
}

function shortSpec(value: string) {
  if (!value) return "No render URI";
  if (value.startsWith("data:")) return "Inline SVG planning specification";
  return value.length > 96 ? `${value.slice(0, 72)}...${value.slice(-16)}` : value;
}

function isWireframePreview(preview: CollectionGeneratorPreview) {
  return preview.productionAssetStatus === "WIREFRAME" || preview.previewClassification === "WIREFRAME_CONCEPT";
}

function previewStatusLabel(preview: CollectionGeneratorPreview) {
  if (preview.productionAssetStatus === "WIREFRAME" || preview.previewClassification === "WIREFRAME_CONCEPT") return "Professional preview pending";
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
  return "Pending art";
}

function formatWeight(value: number) {
  if (value > 100) return `${(value / 100).toFixed(value % 100 === 0 ? 0 : 1)}%`;
  return `${value}%`;
}
