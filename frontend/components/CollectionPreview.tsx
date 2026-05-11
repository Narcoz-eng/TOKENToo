import { BadgeCheck, LockKeyhole, Palette, ShieldCheck, Sparkles, Swords, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import type { CollectionGeneratorPreview } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";
import { ChestOpenAnimation, MintRevealAnimation, RewardBurstAnimation } from "./animations";
import { cn } from "@/lib/utils";
import { hasRealStudioBibleAssets, isStudioPreviewRequired, realStudioBibleAssetsFromPreview, studioPreviewStatusLabel } from "@/lib/studio-readiness";

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
  const studioBibleReady = hasRealStudioBibleAssets(preview);
  const wireframeOnly = isWireframePreview(preview);
  const aiConcept = studioBibleReady;
  const professionalPreview = !wireframeOnly;
  const styleBibleImage = realStudioBibleAssetsFromPreview(preview).find((asset) => asset.type === "STYLE_BIBLE")?.uri ?? "";
  const bannerImage = nonLegacyArt(preview.banner) || styleBibleImage;
  const avatarImage = nonLegacyArt(preview.avatar) || styleBibleImage;
  const visualSamples = professionalPreview ? samples.filter((sample) => Boolean(sample.image) && !isLegacyPlaceholderVisual(sample.image, sample.provider)) : [];
  const tags = identityTags(preview);
  const pitch = culturePitch(preview);
  const generationUnavailable = Boolean(preview.conceptRequest?.providerFailureCode || preview.warnings?.some((warning) => /GEMINI_(?:KEY_MISSING|DISABLED|REQUEST_FAILED|QUOTA_EXCEEDED|MODEL_UNSUPPORTED|TIMEOUT)|AI (?:concept|studio) generation unavailable/i.test(warning)));
  const hiddenFallbackArt = /premium-fallback|fallback-poster/i.test(preview.assetProvider ?? "") || preview.samples.some((sample) => /premium-fallback/i.test(sample.provider ?? ""));
  const conceptRequest = preview.conceptRequest;

  return (
    <div className="space-y-5">
      <SectionCard title={compact ? "Art Direction Review" : "Collection Art Direction"} className="overflow-hidden p-0">
        <div className="relative min-h-[420px]">
          {bannerImage ? <img src={bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/90 to-[#020806]/35" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020806] to-transparent" />
          <div className="relative p-6 lg:p-7">
            <div className="grid gap-6 lg:grid-cols-[128px_minmax(0,1fr)_300px]">
              {avatarImage ? (
                <div className="aspect-square overflow-hidden rounded-md border border-[#15110a] bg-[#ede5d4] p-2 shadow-green">
                  <img src={avatarImage} alt={`${preview.collection} studio bible`} className="h-full w-full rounded-sm border border-black/20 object-cover" />
                </div>
              ) : (
                <div className="aspect-square rounded-md border border-dashed border-vault-line bg-black/35 p-4 text-xs font-bold leading-5 text-slate-400">
                  Studio Bible generation unavailable{preview.providerStatus ? ` - provider reason: ${preview.providerStatus}` : ""}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <StatusPill accent={preview.quality.tier === "Preview required" || preview.quality.tier === "Wireframe concept" || preview.quality.tier === "AI concept" || preview.quality.tier === "AI studio" || preview.quality.tier === "Basic" ? "gold" : "green"}>{preview.quality.tier}</StatusPill>
                  <StatusPill accent="cyan">{cleanDisplayText(preview.theme)}</StatusPill>
                  <StatusPill accent={isProductionStatus(preview.productionAssetStatus) ? "green" : "gold"}>{previewStatusLabel(preview)}</StatusPill>
                  {generationUnavailable ? <StatusPill accent="gold">Generation unavailable</StatusPill> : null}
                  {hiddenFallbackArt ? <StatusPill accent="gold">Fallback hidden</StatusPill> : null}
                </div>
                <h2 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">{preview.collection}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{pitch}</p>
                {!preview.finalProductionReady ? (
                  <p className="mt-3 max-w-3xl rounded-md border border-vault-gold/35 bg-vault-gold/10 px-3 py-2 text-xs font-bold leading-5 text-vault-gold">
                    {generationUnavailable
                      ? exactGenerationReason(preview) ?? "Studio Bible generation is unavailable right now. No fake collection art is shown; continue editing the style bible and retry after the provider issue is fixed."
                      : hiddenFallbackArt
                      ? "Fallback art was returned by the provider and is hidden from creator-facing collection output."
                      : preview.productionAssetStatus === "AI_CONCEPT"
                      ? "Studio Bible art direction only. Final minting requires approved transparent layers, deterministic composition, metadata, and provenance."
                      : "Fast Studio Preview required before reviewing collection visuals."}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  {tags.map((tab, index) => (
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

            {wireframeOnly ? <ProfessionalPreviewGate preview={preview} onGenerateAiConcept={onGenerateAiConcept} canGenerateAiConcept={canGenerateAiConcept} loading={loading} generationUnavailable={generationUnavailable} /> : null}

            {conceptRequest ? <ConceptRunStatus conceptRequest={conceptRequest} provider={preview.assetProvider} fallbackHidden={hiddenFallbackArt} /> : null}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <FeatureTile icon={LockKeyhole} title={wireframeOnly ? "Vault visuals pending" : "Vault NFTs"} body={wireframeOnly ? "Vault NFT visuals pending Fast Studio Preview or curated layer pack." : "Token-backed identity cards with redeem and marketplace hooks."} />
              <FeatureTile icon={Swords} title="Raid Rooms" body={cleanDisplayText(preview.raidTheme || "Faction raids activate after launch.")} />
              <FeatureTile icon={Sparkles} title="Staking" body="Reward hooks and role progression are ready for collection rules." />
            </div>
          </div>
        </div>
      </SectionCard>

      {professionalPreview ? (
        <SectionCard title={aiConcept ? "Studio Bible Preview" : "Vault NFT Preview Set"}>
          {aiConcept ? <p className="mb-4 rounded-md border border-vault-cyan/25 bg-vault-cyan/8 px-3 py-2 text-xs font-bold text-vault-cyan">Studio Bible art direction only. Final layers must be approved before export or launch.</p> : null}
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
        </SectionCard>
      )}

      <StudioBibleAssetStrip preview={preview} />

      <CreatorReadinessGrid preview={preview} wireframeOnly={wireframeOnly} />
      <StudioApprovalStatus preview={preview} />
      <AdvancedCreativeDnaPanel preview={preview} samples={samples} compact={compact} />

      {!compact ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <SectionCard title="Mint Motion">
            <MintRevealAnimation rarity="Epic" label="Studio Mint" />
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

function ProfessionalPreviewGate({ preview, onGenerateAiConcept, canGenerateAiConcept, loading, generationUnavailable }: { preview: CollectionGeneratorPreview; onGenerateAiConcept?: () => void; canGenerateAiConcept: boolean; loading: boolean; generationUnavailable: boolean }) {
  const culture = identityTags(preview);
  return (
    <div className="mt-7 grid gap-4 rounded-lg border border-vault-cyan/25 bg-black/45 p-4 shadow-[0_0_60px_rgba(22,215,210,0.12)] md:grid-cols-[1.2fr_.8fr]">
      <div>
        <div className="flex items-center gap-2 text-vault-cyan">
          <Wand2 className="size-4" />
          <p className="text-xs font-black uppercase tracking-[0.18em]">Creative DNA Ready</p>
        </div>
        <p className="mt-3 text-2xl font-black leading-tight text-white">{generationUnavailable ? "Generation unavailable - style bible remains editable" : "Fast Studio Preview required"}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{culturePitch(preview)}</p>
        {onGenerateAiConcept ? (
          <button type="button" onClick={onGenerateAiConcept} disabled={!canGenerateAiConcept || loading} className="phew-button phew-button-primary mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-55">
            <Sparkles className="size-4" /> {generationUnavailable ? "Retry Fast Studio Preview" : "Fast Studio Preview"}
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

function ConceptRunStatus({ conceptRequest, provider, fallbackHidden }: { conceptRequest: NonNullable<CollectionGeneratorPreview["conceptRequest"]>; provider?: string; fallbackHidden: boolean }) {
  const paid = Boolean(conceptRequest.usesPaidOpenAIImageGeneration);
  const imagesThisRun = conceptRequest.imagesThisRun ?? conceptRequest.imageCount ?? 0;
  return (
    <div className="mt-5 grid gap-3 rounded-lg border border-vault-line bg-black/35 p-4 text-xs font-bold text-slate-300 md:grid-cols-4">
      <p>Provider <span className="mt-1 block text-sm font-black text-white">{providerLabel(provider ?? conceptRequest.provider)}</span></p>
      <p>Images <span className="mt-1 block text-sm font-black text-white">{imagesThisRun}</span></p>
      <p>Estimated cost <span className={cn("mt-1 block text-sm font-black", paid ? "text-vault-gold" : "text-vault-green")}>{formatUsd(conceptRequest.estimatedCostUsd)}</span></p>
      <p>Cache <span className={cn("mt-1 block text-sm font-black", conceptRequest.cachedResultAvailable || conceptRequest.cacheStatus === "hit" ? "text-vault-green" : "text-vault-gold")}>{conceptRequest.cachedResultAvailable || conceptRequest.cacheStatus === "hit" ? "Available" : fallbackHidden ? "Fallback hidden" : "Not available"}</span></p>
    </div>
  );
}

function ProfessionalPreviewRequirement({ preview, onGenerateAiConcept, canGenerateAiConcept, loading }: { preview: CollectionGeneratorPreview; onGenerateAiConcept?: () => void; canGenerateAiConcept: boolean; loading: boolean }) {
  const generationUnavailable = Boolean(preview.conceptRequest?.providerFailureCode || preview.warnings?.some((warning) => /GEMINI_(?:KEY_MISSING|DISABLED|REQUEST_FAILED|QUOTA_EXCEEDED|MODEL_UNSUPPORTED|TIMEOUT)|AI (?:concept|studio) generation unavailable/i.test(warning)));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-vault-gold/30 bg-vault-gold/8 p-5">
          <p className="text-sm font-black uppercase text-vault-gold">Creative DNA ready</p>
          <h3 className="mt-2 text-2xl font-black text-white">Fast Studio Preview required</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{generationUnavailable ? "Studio generation is currently unavailable. No fake collection art is shown; use the studio bible and retry after the provider issue is fixed." : "A polished identity direction is ready. Generate Studio Bible sheets to review traits, mood, rarity, and layer direction before any launch decision."}</p>
          {onGenerateAiConcept ? (
            <button type="button" onClick={onGenerateAiConcept} disabled={!canGenerateAiConcept || loading} className="phew-button phew-button-primary mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-55">
              <Sparkles className="size-4" /> {generationUnavailable ? "Retry Fast Studio Preview" : "Fast Studio Preview"}
            </button>
          ) : null}
        </div>
        <div className="rounded-lg border border-vault-line bg-black/35 p-5">
          <p className="text-xs uppercase text-slate-500">Production path</p>
          <div className="mt-3 space-y-2 text-sm font-bold text-slate-200">
            <p>Fast Studio Preview</p>
            <p>Layered curated or artist-cleaned production assets</p>
            <p>Final production assets</p>
          </div>
        </div>
      </div>
      <CreatorSignalGrid preview={preview} />
    </div>
  );
}

function StudioBibleAssetStrip({ preview }: { preview: CollectionGeneratorPreview }) {
  const assets = realStudioBibleAssetsFromPreview(preview);
  if (!assets.length) return null;
  return (
    <SectionCard title="NFT Studio Bible Assets">
      <div className="grid gap-4 lg:grid-cols-2">
        {assets.map((asset) => (
          <figure key={asset!.type} className="rounded-md border border-[#15110a] bg-[#ede5d4] p-3">
            <div className="mb-2 flex items-center justify-between gap-3 border-b border-black/20 pb-2">
              <figcaption className="text-xs font-black uppercase tracking-[0.16em] text-black">{asset!.label}</figcaption>
              <span className="rounded-sm bg-black px-2 py-1 text-[10px] font-black uppercase text-[#baff00]">{asset!.type.replaceAll("_", " ")}</span>
            </div>
            <img src={asset!.uri} alt={asset!.label} className="h-80 w-full rounded-sm border border-black/20 bg-[#f4efdf] object-cover" />
          </figure>
        ))}
      </div>
    </SectionCard>
  );
}

function CreatorSignalGrid({ preview }: { preview: CollectionGeneratorPreview }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard title="Identity" body={publicCollectionName(preview)} />
      <SummaryCard title="Culture pitch" body={culturePitch(preview)} />
      <SummaryCard title="Raid readiness" body={cleanDisplayText(preview.raidTheme || "Raid rooms ready")} />
      <SummaryCard title="Staking readiness" body="Reward hooks and holder progression are ready for creator review." />
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

function CreatorReadinessGrid({ preview, wireframeOnly }: { preview: CollectionGeneratorPreview; wireframeOnly: boolean }) {
  return (
    <SectionCard title="Creator Snapshot">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReviewItem icon={BadgeCheck} label="Collection" value={publicCollectionName(preview)} />
        <ReviewItem icon={Palette} label="Visual direction" value={cleanDisplayText(preview.artStyle)} />
        <ReviewItem icon={Swords} label="Raids" value={cleanDisplayText(preview.raidTheme || "Raid rooms ready")} />
        <ReviewItem icon={ShieldCheck} label="Preview status" value={wireframeOnly ? "Fast Studio Preview required" : `${preview.quality.previewQualityScore}% preview score`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {identityTags(preview).map((tag) => (
          <span key={tag} className="rounded-md border border-vault-cyan/20 bg-vault-cyan/8 px-3 py-2 text-xs font-bold text-vault-cyan">{tag}</span>
        ))}
      </div>
    </SectionCard>
  );
}

function StudioApprovalStatus({ preview }: { preview: CollectionGeneratorPreview }) {
  const workflow = preview.studioWorkflow;
  const locks = [
    ["Art direction", workflow?.locks.artDirection],
    ["Style", workflow?.locks.style],
    ["Mood", workflow?.locks.mood],
    ["Rarity direction", workflow?.locks.rarityDirection]
  ] as const;
  const approvals = [
    ["Silhouette system", workflow?.approvals.silhouetteSystem],
    ["Faction culture", workflow?.approvals.factionCulture],
    ["Trait family", workflow?.approvals.traitFamily],
    ["Cinematic direction", workflow?.approvals.cinematicDirection]
  ] as const;
  return (
    <SectionCard title="Studio Approval Track">
      <div className="grid gap-3 md:grid-cols-2">
        <ApprovalGroup title="Locked Direction" items={locks} activeSuffix="locked" />
        <ApprovalGroup title="Creator Approvals" items={approvals} activeSuffix="approved" />
      </div>
    </SectionCard>
  );
}

function ApprovalGroup({ title, items, activeSuffix }: { title: string; items: readonly (readonly [string, boolean | undefined])[]; activeSuffix: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/25 p-4">
      <p className="mb-3 text-xs font-black uppercase text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(([label, active]) => (
          <span key={label} className={cn("rounded-md border px-3 py-2 text-xs font-bold", active ? "border-vault-green/35 bg-vault-green/10 text-vault-green" : "border-white/10 bg-white/5 text-slate-400")}>{active ? `${label} ${activeSuffix}` : label}</span>
        ))}
      </div>
    </div>
  );
}

function AdvancedCreativeDnaPanel({ preview, samples, compact }: { preview: CollectionGeneratorPreview; samples: CollectionGeneratorPreview["samples"]; compact: boolean }) {
  const wireframeOnly = isWireframePreview(preview);
  const taxonomy = Object.entries(preview.traitCounts).slice(0, compact ? 6 : 12);
  const promptSpecs = [
    cleanDisplayText(preview.artStyle),
    cleanDisplayText(preview.backgroundWorld),
    cleanDisplayText(preview.raidTheme)
  ].filter(Boolean);
  return (
    <details className="rounded-lg border border-vault-line bg-black/25 p-4">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-black text-slate-200">
        <span>Advanced Creative DNA</span>
        <span className="text-xs font-bold uppercase text-slate-500">Collapsed by default</span>
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdvancedBlock title="Mood Culture">
          <div className="flex flex-wrap gap-2">
            {identityTags(preview).map((tag) => (
              <span key={tag} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200">{tag}</span>
            ))}
          </div>
        </AdvancedBlock>
        <AdvancedBlock title="Rarity Plan">
          <div className="space-y-3">
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
        </AdvancedBlock>
        <AdvancedBlock title="Production Layer Plan">
          <div className="grid gap-2 sm:grid-cols-2">
            {taxonomy.map(([name, count]) => (
              <div key={name} className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
                <p className="text-xs font-bold text-slate-300">{cleanDisplayText(name)}</p>
                <p className="mt-1 text-[11px] uppercase text-slate-500">{count} planned variants</p>
              </div>
            ))}
          </div>
        </AdvancedBlock>
        <AdvancedBlock title="Visual Direction">
          <div className="space-y-2">
            {promptSpecs.map((spec) => (
              <p key={spec} className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-slate-300">{spec}</p>
            ))}
          </div>
        </AdvancedBlock>
      </div>
      {wireframeOnly ? (
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
      ) : null}
    </details>
  );
}

function AdvancedBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/25 p-4">
      <p className="mb-3 text-xs font-black uppercase text-slate-500">{title}</p>
      {children}
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
      <p className="font-black text-white">Vault NFT visuals pending Fast Studio Preview or curated layer pack.</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">No wireframe artwork is shown as collection art.</p>
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

function publicCollectionName(preview: CollectionGeneratorPreview) {
  return cleanDisplayText(preview.collection.replace(/^\$/, "")) || "Collection";
}

function culturePitch(preview: CollectionGeneratorPreview) {
  const name = publicCollectionName(preview);
  const source = `${preview.collection} ${preview.theme} ${preview.mascot} ${preview.artStyle} ${preview.backgroundWorld} ${preview.lore} ${preview.traitLanguage.join(" ")}`.toLowerCase();
  if (/hanta|hantavirus|virus|viral|biohazard|quarantine|mutation|containment|toxic|lab/.test(source)) {
    return `${name} is forming a containment faction around quarantine energy, mutated silhouettes, and high-voltage meme lore.`;
  }
  if (/aura|glow|pulse|motion|signal|energy/.test(source)) {
    return `${name} is forming a broadcast-born faction around motion rituals, charged silhouettes, and late-night holder suspense.`;
  }
  if (/market|liquidity|candle|chart|degen|pump|orderbook/.test(source)) {
    return `${name} is forming a trading-floor faction around candlestick shadows, raid momentum, and visible holder status.`;
  }
  const anchors = identityTags(preview)
    .filter((tag) => !/ready|staking|raid/i.test(tag))
    .slice(0, 3)
    .map((tag) => tag.toLowerCase());
  return `${name} is forming a ${cleanDisplayText(preview.theme).toLowerCase()} around ${joinNatural(anchors.length ? anchors : ["identity", "community energy", "ownership status"])}.`;
}

function identityTags(preview: CollectionGeneratorPreview) {
  const source = `${preview.collection} ${preview.theme} ${preview.mascot} ${preview.artStyle} ${preview.backgroundWorld} ${preview.lore} ${preview.traitLanguage.join(" ")}`.toLowerCase();
  const tags: string[] = [];
  if (/hanta|hantavirus|virus|viral|biohazard|quarantine|mutation|containment|toxic|lab/.test(source)) tags.push("Containment Culture", "Mutation Glow", "Raid Energy");
  if (/aura|glow|pulse|motion|signal|energy/.test(source)) tags.push("Broadcast Aura", "Motion Rituals", "Holder Suspense");
  if (/market|liquidity|candle|chart|degen|pump|orderbook/.test(source)) tags.push("Trading Floor Myth", "Candlestick Shadows", "Holder Status");
  if (/dream|vapor|liminal|surreal/.test(source)) tags.push("Dream Logic", "Surreal World", "Collector Myth");
  if (/cute|toy|soft|sticker|cozy/.test(source)) tags.push("Soft Culture", "Sticker Energy", "Cozy Holders");
  tags.push("Raid-ready", "Staking-ready");
  return [...new Set(tags.map(cleanDisplayText).filter(Boolean))].slice(0, 6);
}

function cleanDisplayText(value: string | undefined | null) {
  const raw = String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(has sparse official metadata|sparse official metadata|internal identity seed|inferred token native subject|token native subject|fallback market signals|fallback provider|source metadata|metadata confidence|inferred identity|join the faction)\b/gi, "")
    .replace(/\b(metadata|internal|inferred|fallback|provider|confidence|context)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const clipped = raw.length > 110 ? `${raw.slice(0, 106).trim()}...` : raw;
  return clipped.includes(".") ? clipped : titleCase(clipped);
}

function titleCase(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function joinNatural(items: string[]) {
  if (items.length <= 1) return items[0] ?? "community energy";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function nonLegacyArt(src: string | undefined | null, provider?: string) {
  if (!src || isLegacyPlaceholderVisual(src, provider)) return "";
  return src;
}

function isLegacyPlaceholderVisual(src: string | undefined | null, provider?: string) {
  const value = String(src ?? "");
  const decoded = safeDecode(value.slice(0, 4000)).toLowerCase();
  return /local-placeholder|planning visual|branded placeholder|local-branded-placeholder|premium-fallback|fallback-poster|smiley|pink/.test(`${provider ?? ""} ${value.toLowerCase()} ${decoded}`);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function exactGenerationReason(preview: CollectionGeneratorPreview) {
  const warning = preview.warnings?.find((item) => /GEMINI_(?:KEY_MISSING|DISABLED|REQUEST_FAILED|QUOTA_EXCEEDED|MODEL_UNSUPPORTED|TIMEOUT)|(?:AI|Gemini|Studio Bible|studio) (?:concept|studio|generation|image)?\s*unavailable/i.test(item));
  if (!warning) return preview.conceptRequest?.providerFailureCode ?? preview.conceptRequest?.providerFailureReason;
  return warning.replace(/^AI (?:concept|studio) generation unavailable:\s*/i, "Studio generation unavailable: ");
}

function providerLabel(provider?: string) {
  if (!provider) return "Automatic fallback";
  if (/cached-gemini/i.test(provider)) return "Cached Gemini";
  if (/unavailable|no-studio-sheets/i.test(provider)) return "Gemini unavailable";
  if (/gemini/i.test(provider)) return "Gemini Studio";
  if (/openai/i.test(provider)) return "OpenAI premium cinematic";
  if (/cached/i.test(provider)) return "Cached studio preview";
  if (/deterministic/i.test(provider)) return "Deterministic dev fallback";
  if (/premium-fallback|fallback-poster/i.test(provider)) return "Fallback art hidden";
  if (/local-placeholder|planning/i.test(provider)) return "Legacy preview hidden";
  return cleanDisplayText(provider);
}

function formatUsd(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  if (!Number.isFinite(amount) || amount <= 0) return "$0.00";
  return amount < 0.01 ? "<$0.01" : `$${amount.toFixed(2)}`;
}

function shortSpec(value: string) {
  if (!value) return "No render URI";
  if (value.startsWith("data:")) return "Inline studio visual";
  return value.length > 96 ? `${value.slice(0, 72)}...${value.slice(-16)}` : value;
}

function isWireframePreview(preview: CollectionGeneratorPreview) {
  return isStudioPreviewRequired(preview);
}

function previewStatusLabel(preview: CollectionGeneratorPreview) {
  return studioPreviewStatusLabel(preview);
}

function isProductionStatus(status: CollectionGeneratorPreview["productionAssetStatus"]) {
  return status === "CURATED_LAYER_READY" || status === "ARTIST_APPROVED" || status === "FINAL_PRODUCTION";
}

function assetStatusLabel(status: CollectionGeneratorPreview["productionAssetStatus"]) {
  if (status === "FINAL_PRODUCTION") return "Final";
  if (status === "ARTIST_APPROVED") return "Artist approved";
  if (status === "CURATED_LAYER_READY") return "Curated layers";
  if (status === "AI_CONCEPT") return "Art direction only";
  return "Pending art";
}

function formatWeight(value: number) {
  if (value > 100) return `${(value / 100).toFixed(value % 100 === 0 ? 0 : 1)}%`;
  return `${value}%`;
}
