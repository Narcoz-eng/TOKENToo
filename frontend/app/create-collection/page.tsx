"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Loader2, LockKeyhole, Palette, RadioTower, RefreshCcw, Search, ShieldCheck, Sparkles, Swords, Upload, Wand2, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionPreview } from "@/components/CollectionPreview";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiFetch } from "@/lib/api";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import type { ArtTeamProfile, CollectionGeneratorPreview, ConceptRequestSummary, CuratedLayerPackSummary, StudioPreviewAsset, StudioWorkflowState, StyleBiblePlan, StudioExportPlan } from "@/lib/types";
import { brandAssets } from "@/lib/brand-assets";
import { showPrivateDiagnostics } from "@/lib/diagnostics-access";
import { hasRealStudioBibleAssets, isRealStudioBibleAsset, isStudioPreviewRequired, realStudioBibleAssetsFromPreview, studioAssetProvider, studioBibleAssetTypes, studioDisplayAssetTypeSet, studioPreviewStatusLabel } from "@/lib/studio-readiness";
import { cn } from "@/lib/utils";

type Preset = { id: string; name: string; artStyle: string; mood: string };
type ProductionAssetStatus = "WIREFRAME" | "AI_CONCEPT" | "CURATED_LAYER_READY" | "ARTIST_APPROVED" | "FINAL_PRODUCTION";
type StudioWorkflowActionName =
  | "lock-art-direction"
  | "lock-style"
  | "lock-mood"
  | "lock-rarity-direction"
  | "regenerate-rarity-tier"
  | "regenerate-mood-set"
  | "regenerate-legendary-scene"
  | "approve-silhouette-system"
  | "approve-faction-culture"
  | "approve-trait-family"
  | "approve-cinematic-direction";
type SystemCapabilities = {
  databaseAvailable?: boolean;
  geminiTextAvailable?: boolean;
  imagenImagesAvailable?: boolean;
  fastStudioPreviewAvailable?: boolean;
  premiumCinematicAvailable?: boolean;
  openaiImagesAvailable?: boolean;
  pinataAvailable?: boolean;
  permanentStorageConfigured?: boolean;
  solanaAvailable?: boolean;
  solanaRpcConfigured?: boolean;
  solanaTransactionProviderDevnet?: boolean;
  walletConfigured?: boolean;
  devnetProgramConfigured?: boolean;
  programAccountExists?: boolean;
  programAccountExecutable?: boolean;
  aiGenerationEnabled?: boolean;
  localPreviewProviderEnabled?: boolean;
  approvedLayerPackAvailable?: boolean;
  demoCuratedLayerPackEnabled?: boolean;
  demoCuratedLayerPackAllowed?: boolean;
  productionStorageAvailable?: boolean;
  professionalPreviewReady?: boolean;
  launchAvailable?: boolean;
  mintingAvailable?: boolean;
  creatorSetupRequired?: boolean;
};
type SetupMode = {
  id: "creative-preview" | "devnet-test-launch" | "production-launch";
  label: string;
  ready: boolean;
  output: string;
  missing: string[];
  blockedBy: string[];
};
type SetupChecklist = {
  storageProvider: string;
  creativePreviewReady: boolean;
  devnetLaunchReady: boolean;
  productionLaunchReady: boolean;
  items: Array<{
    key: string;
    label: string;
    ok: boolean;
    requiredFor: string[];
    fix: string;
  }>;
};
type SystemCapabilitiesResponse = {
  mode: string;
  cluster: string;
  programId: string | null;
  capabilities: SystemCapabilities;
  setupModes: SetupMode[];
  setupChecklist: SetupChecklist;
  publicReadiness?: {
    professionalPreviewReady: boolean;
    launchAvailable: boolean;
    mintingAvailable: boolean;
    creatorSetupRequired: boolean;
    messages: string[];
  };
  technicalDiagnosticsEnabled?: boolean;
  warnings: string[];
};
type GeneratorRun = {
  id: string;
  status: string;
  tokenSymbol: string;
  studioProvider?: string | null;
  cinematicProvider?: string | null;
  estimatedCostUsd?: string | number | null;
  generationCostBreakdown?: unknown;
  curatedLayerPacks?: CuratedLayerPackSummary[];
  communityHints?: unknown;
  approvedVersion?: number | null;
  styleProfiles: Array<{
    id: string;
    version: number;
    collection: string;
    theme: string;
    mascot: string;
    artStyle: string;
    colors: unknown;
    backgroundWorld: string;
    traitLanguage: unknown;
    rarityStructure: unknown;
    legendaryTheme: string;
    animationStyle: string;
    raidTheme: string;
    lore: string;
    roleNames: unknown;
    brandDna?: unknown;
    visualFingerprint?: unknown;
    productionAssetStatus?: ProductionAssetStatus;
    isApproved: boolean;
    traitPack?: {
      categories: unknown;
      rarityWeights: unknown;
      unlockSchedule: unknown;
    } | null;
    previewAssets: Array<{
      type: "AVATAR" | "BANNER" | "SAMPLE_NFT" | "TRAIT_SHEET" | "ANIMATION_KEYFRAME" | "STYLE_BIBLE" | "TRAIT_CATALOG" | "RARITY_LADDER" | "MOOD_SHEET" | "LAYER_BREAKDOWN" | "HERO_CONCEPT";
      label: string;
      uri: string;
      metadata: unknown;
      generationMetadata?: unknown;
      promptHash?: string | null;
      productionAssetStatus?: ProductionAssetStatus;
      previewClassification?: "WIREFRAME_CONCEPT" | "AI_CONCEPT_PREVIEW" | "PRODUCTION_ASSET_PREVIEW";
      provider?: string | null;
      version: number;
    }>;
    qualityReports: Array<{
      previewQualityScore: number;
      uniquenessScore: number;
      colorHarmonyScore: number;
      duplicateRiskScore: number;
      compatibilityScore: number;
      tier: "BASIC" | "PREMIUM" | "LEGENDARY_READY";
      passed: boolean;
    }>;
    distinctivenessReports: Array<{
      silhouetteUniqueness: number;
      paletteUniqueness: number;
      mascotUniqueness: number;
      backgroundWorldUniqueness: number;
      traitLanguageUniqueness: number;
      score: number;
      passed: boolean;
    }>;
  }>;
};

type PreviewOnlyResponse = {
  ok: true;
  assetProvider: string;
  previewClassification?: "WIREFRAME_CONCEPT" | "AI_CONCEPT_PREVIEW" | "PRODUCTION_ASSET_PREVIEW";
  productionAssetStatus: ProductionAssetStatus;
  finalProductionReady: boolean;
  brandDna: Record<string, unknown>;
  collection: {
    name: string;
    palette: string[];
    mascotArchetype: string;
    description: string;
    theme: string;
    world: string;
    renderStyle: string;
  };
  avatarPreviewSpec?: { uri: string };
  bannerPreviewSpec?: { uri: string };
  samples: Array<{ label: string; uri: string; provider?: string; metadata: Record<string, unknown> }>;
  traitTable: Array<{ category: string; count: number; examples: string[] }>;
  rarityTable: Record<string, number>;
  animationMoments: Array<{ moment: string; spec: string }>;
  quality: {
    previewQualityScore: number;
    uniquenessScore: number;
    colorHarmonyScore: number;
    duplicateRiskScore: number;
    compatibilityScore: number;
    tier: "BASIC" | "PREMIUM" | "LEGENDARY_READY";
    passed: boolean;
    issues?: string[];
  };
  distinctiveness: {
    silhouetteUniqueness: number;
    paletteUniqueness: number;
    mascotUniqueness: number;
    backgroundWorldUniqueness: number;
    traitLanguageUniqueness: number;
    score: number;
    passed: boolean;
  };
  tenKReadiness: {
    estimated10kFeasible: boolean;
    possibleUniqueCombinations: string;
    duplicateRisk: string;
    visualDiversityScore: number;
    blockers: string[];
  };
  styleBible?: StyleBiblePlan;
  studioAssets?: StudioPreviewAsset[];
  styleBibleAsset?: StudioPreviewAsset;
  traitCatalogAsset?: StudioPreviewAsset;
  rarityLadderAsset?: StudioPreviewAsset;
  moodSheetAsset?: StudioPreviewAsset;
  layerBreakdownAsset?: StudioPreviewAsset;
  artTeam?: ArtTeamProfile;
  traitCoverageScore?: number;
  rarityDiversityScore?: number;
  providerStatus?: string;
  exportPlan?: StudioExportPlan;
  conceptRequest?: ConceptRequestSummary;
  warnings: string[];
};

type TokenScan = {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  metadataUri?: string;
  imageUri?: string;
  logoUri?: string;
  externalUrl?: string;
  decimals: number;
  supply?: string;
  socialLinks?: Record<string, string>;
  extensions?: Record<string, unknown>;
  riskNotes: string[];
  riskScore: number;
  persistenceWarning?: string;
};

const steps = ["Basics", "Brand Kit", "Vault Collection", "Review", "Launch"];
const rarityRows = [
  ["Common", "Core vault frame", "62%"],
  ["Rare", "Charged cyan relic", "24%"],
  ["Epic", "Overclocked vault core", "10%"],
  ["Legendary", "Gold founder seal", "4%"]
];
export default function CreateCollectionPage() {
  const walletAuth = useWalletAuth();
  const capabilityState = useApiResource<SystemCapabilitiesResponse>("/system/capabilities");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenMint, setTokenMint] = useState("");
  const [logoUri, setLogoUri] = useState("");
  const [description, setDescription] = useState("");
  const [scan, setScan] = useState<TokenScan | null>(null);
  const [memes, setMemes] = useState("");
  const [phrases, setPhrases] = useState("");
  const [mascotPreference, setMascotPreference] = useState("");
  const [mood, setMood] = useState("");
  const [run, setRun] = useState<GeneratorRun | null>(null);
  const [previewOnly, setPreviewOnly] = useState<PreviewOnlyResponse | null>(null);
  const [conceptPlan, setConceptPlan] = useState<ConceptRequestSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [launchResult, setLaunchResult] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [setupActionMessage, setSetupActionMessage] = useState<string | null>(null);
  const [layerPackRoot, setLayerPackRoot] = useState("");
  const [exportCount, setExportCount] = useState(100);
  const presetName = selectedPresetName(presets, selectedPreset);
  const preview = useMemo(() => (run ? mapRunToPreview(run, presetName) : previewOnly ? mapPreviewOnly(previewOnly, presetName) : null), [run, previewOnly, presetName]);
  const latestProfile = run?.styleProfiles[0];
  const latestQuality = latestProfile?.qualityReports[0];
  const latestDistinctiveness = latestProfile?.distinctivenessReports[0];
  const studioApprovalsComplete = Boolean(preview?.studioWorkflow?.locks.artDirection && preview.studioWorkflow.approvals.silhouetteSystem && preview.studioWorkflow.approvals.factionCulture && preview.studioWorkflow.approvals.traitFamily && preview.studioWorkflow.approvals.cinematicDirection);
  const curatedApprovalReady = preview?.curatedLayerPack?.status === "VALID" || preview?.curatedLayerPack?.status === "EXPORT_READY";
  const canApprove = Boolean(run && approvalConfirmed && studioApprovalsComplete && curatedApprovalReady && latestQuality?.passed && latestQuality.tier !== "BASIC" && latestDistinctiveness?.passed && capabilityState.data?.capabilities?.databaseAvailable);
  const effectiveTokenName = tokenName.trim() || scan?.name || "";
  const effectiveTokenSymbol = tokenSymbol.trim() || scan?.symbol || "";
  const effectiveDescription = description.trim() || scan?.description || (effectiveTokenName ? `${effectiveTokenName} holder community built from verified Solana token metadata.` : "");
  const effectiveLogoUri = logoUri.trim() || scan?.imageUri || scan?.logoUri || "";
  const studioPreview = preview ?? fallbackPreview(effectiveTokenName, effectiveTokenSymbol, effectiveDescription, presetName);
  const activeStep = launchResult ? 4 : run?.status === "APPROVED" ? 3 : preview ? 2 : scan ? 1 : 0;
  const setup = capabilityState.data?.setupChecklist;
  const capabilities = capabilityState.data?.capabilities;
  const privateDiagnostics = showPrivateDiagnostics(walletAuth.address);
  const canGenerateAiConcept = Boolean(scan);
  const canSaveDraft = Boolean(scan && walletAuth.connected && (privateDiagnostics ? capabilities?.databaseAvailable : setup?.creativePreviewReady));
  const launchEnvironmentReady = Boolean(setup?.devnetLaunchReady || setup?.productionLaunchReady);

  useEffect(() => {
    apiFetch<Preset[]>("/generator/presets")
      .then((data) => {
        setPresets(data);
        if (data[0] && !data.some((preset) => preset.id === selectedPreset)) setSelectedPreset(data[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, [selectedPreset]);

  useEffect(() => {
    if (!scan) {
      setConceptPlan(null);
      return;
    }
    let cancelled = false;
    apiFetch<{ ok: true } & ConceptRequestSummary>("/generator/ai-concept/validate-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(previewPayload()),
      timeoutMs: 45_000
    })
      .then((data) => {
        if (!cancelled) setConceptPlan(data);
      })
      .catch(() => {
        if (!cancelled) setConceptPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scan, tokenName, tokenSymbol, tokenMint, logoUri, description, selectedPreset, memes, phrases, mascotPreference, mood]);

  async function createRun() {
    await action(async () => {
      const data = await walletAuth.authFetch<GeneratorRun>("/generator/runs", {
        method: "POST",
        body: JSON.stringify({
          tokenName: tokenName.trim() || undefined,
          tokenSymbol: tokenSymbol.trim() || undefined,
          tokenMint,
          logoUri: logoUri.trim() || undefined,
          description: description.trim() || undefined,
          selectedPreset,
          hints: {
            sourceMetadata: scan ? sourceMetadataFromScan(scan) : undefined,
            overrides: overridePayload(scan, tokenName, tokenSymbol, description, logoUri),
            memes: splitList(memes),
            phrases: splitList(phrases),
            slogans: splitList(phrases).slice(0, 2),
            mascotPreference,
            mood
          }
        })
      });
      setRun(data);
    });
  }

  async function scanToken() {
    await action(async () => {
      const mint = tokenMint.trim();
      const data = await apiFetch<TokenScan>(`/tokens/${encodeURIComponent(mint)}/scan`);
      setScan(data);
      setRun(null);
      setPreviewOnly(null);
    });
  }

  async function generatePreview() {
    await action(async () => {
      const data = await apiFetch<PreviewOnlyResponse>("/generator/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(previewPayload()),
        timeoutMs: 180_000,
        maxResponseBytes: 35_000_000
      });
      setPreviewOnly(data);
      setConceptPlan(data.conceptRequest ?? null);
      console.info(
        "[generator-preview] classification",
        JSON.stringify({
          assetProvider: data.assetProvider,
          previewClassification: data.previewClassification,
          productionAssetStatus: data.productionAssetStatus,
          previewAssetCount: (data.bannerPreviewSpec ? 1 : 0) + (data.avatarPreviewSpec ? 1 : 0) + data.samples.length,
          sampleCount: data.samples.length,
          provider: data.conceptRequest?.provider,
          imageCount: data.conceptRequest?.imageCount,
          estimatedCostUsd: data.conceptRequest?.estimatedCostUsd,
          generationType: data.conceptRequest?.generationType,
          cachedResultAvailable: data.conceptRequest?.cachedResultAvailable,
          usesPaidOpenAIImageGeneration: data.conceptRequest?.usesPaidOpenAIImageGeneration
        })
      );
      setRun(null);
    });
  }

  async function mutateRun(path: string) {
    if (!run) return;
    await action(async () => {
      const data = await walletAuth.authFetch<GeneratorRun>(`/generator/runs/${run.id}/${path}`, { method: "POST" });
      setRun(data);
    });
  }

  async function studioAction(actionName: StudioWorkflowActionName, target?: string) {
    if (!run) return;
    await action(async () => {
      const data = await walletAuth.authFetch<GeneratorRun>(`/generator/runs/${run.id}/studio-action`, {
        method: "POST",
        body: JSON.stringify({ action: actionName, target })
      });
      setRun(data);
    });
  }

  async function importLayerPack() {
    if (!run) return;
    await action(async () => {
      const data = await walletAuth.authFetch<GeneratorRun>(`/generator/runs/${run.id}/layer-pack/import`, {
        method: "POST",
        body: JSON.stringify({ rootPath: layerPackRoot.trim(), name: `${run.tokenSymbol} curated layer pack` })
      });
      setRun(data);
    });
  }

  async function exportLayerPack() {
    if (!run) return;
    await action(async () => {
      const data = await walletAuth.authFetch<{ run: GeneratorRun; export: { count: number; zipPath?: string; zipBytes: number; provenanceHash: string } }>(`/generator/runs/${run.id}/layer-pack/export`, {
        method: "POST",
        body: JSON.stringify({ count: exportCount })
      });
      setRun(data.run);
      setSetupActionMessage(`Deterministic export ready: ${data.export.count} NFTs, ${Math.round(data.export.zipBytes / 1024)} KB ZIP${data.export.zipPath ? ` at ${data.export.zipPath}` : ""}.`);
    });
  }

  async function approveRun() {
    if (!run) return;
    await action(async () => {
      const data = await walletAuth.authFetch<GeneratorRun>(`/generator/runs/${run.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          explicitConfirmation: approvalConfirmed,
          acceptedVersion: run.styleProfiles[0]?.version
        })
      });
      setRun(data);
    });
  }

  async function launchCollection() {
    if (!run) return;
    await action(async () => {
      const data = await walletAuth.authFetch<{ id: string; slug: string }>(`/generator/runs/${run.id}/launch-collection`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setLaunchResult(`/collections/${data.slug}`);
    });
  }

  async function useDemoCuratedLayerPack() {
    if (!capabilities?.demoCuratedLayerPackAllowed) {
      setSetupActionMessage("Set DEMO_CURATED_LAYER_PACK=true in local/devnet env, then restart the backend. This mode is devnet demo only and blocked in production.");
      return;
    }
    const devnetMode = capabilityState.data?.setupModes.find((mode) => mode.id === "devnet-test-launch");
    if (devnetMode && !devnetMode.ready) {
      setSetupActionMessage(`Demo pack is enabled, but Devnet Test Launch Mode still needs: ${devnetMode.missing.join(", ")}.`);
      return;
    }
    if (!walletAuth.connected) {
      setSetupActionMessage("Connect a wallet before creating or regenerating a devnet launch draft with the demo curated layer pack.");
      return;
    }
    if (run) {
      await mutateRun("regenerate-style");
      setSetupActionMessage("Demo curated layer pack is active for this regenerated devnet draft. It remains labeled devnet demo only.");
      return;
    }
    if (!scan) {
      setSetupActionMessage("Scan a token first, then use the devnet demo curated layer pack on a saved launch draft.");
      return;
    }
    await createRun();
    setSetupActionMessage("Demo curated layer pack is active for the new devnet launch draft. It remains labeled devnet demo only.");
  }

  function attachCuratedLayerPack() {
    setSetupActionMessage("Attach real curated assets by setting CURATED_LAYER_PACK_MANIFEST_URI, CURATED_LAYER_PACK_ROOT, or APPROVED_LAYER_PACK_ID. Demo packs do not satisfy Production Launch Mode.");
  }

  async function validateSetup(kind: "program" | "storage") {
    await action(async () => {
      const data = await apiFetch<SystemCapabilitiesResponse>("/system/capabilities", { cache: "no-store" });
      capabilityState.reload();
      if (kind === "program") {
        const ok = data.capabilities.devnetProgramConfigured && data.capabilities.solanaRpcConfigured && data.capabilities.programAccountExecutable;
        const missing = [
          data.capabilities.devnetProgramConfigured ? "" : "PROGRAM_ID",
          data.capabilities.solanaRpcConfigured ? "" : "SOLANA_RPC_URL",
          data.capabilities.programAccountExecutable ? "" : "executable program account"
        ].filter(Boolean);
        setSetupActionMessage(ok ? `Program ID validated on ${data.cluster}: ${short(data.programId ?? "")}.` : `Program validation failed. Missing or invalid: ${missing.join(", ")}.`);
        return;
      }
      const ok = data.capabilities.permanentStorageConfigured;
      setSetupActionMessage(ok ? `Storage validated using ${data.setupChecklist.storageProvider}.` : "Storage validation failed. Configure PINATA_JWT or another permanent storage provider credential.");
    });
  }

  async function action(fn: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generator request failed");
    } finally {
      setLoading(false);
    }
  }

  function previewPayload() {
    return {
      tokenName: tokenName.trim() || undefined,
      tokenSymbol: tokenSymbol.trim() || undefined,
      tokenMint,
      logoUri: logoUri.trim() || undefined,
      description: description.trim() || undefined,
      selectedPreset,
      hints: {
        sourceMetadata: scan ? sourceMetadataFromScan(scan) : undefined,
        overrides: overridePayload(scan, tokenName, tokenSymbol, description, logoUri),
        memes: splitList(memes),
        phrases: splitList(phrases),
        slogans: splitList(phrases).slice(0, 2),
        mascotPreference,
        mood
      }
    };
  }

  return (
    <AppShell active="create">
      <div className="space-y-6">
        <section className="phew-panel phew-scanline relative overflow-hidden rounded-lg p-6 lg:p-8">
          <img src={brandAssets.launchHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-48" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/88 to-[#020806]/28" />
          <div className="absolute inset-0 grid-mask opacity-25" />
          <div className="relative max-w-5xl">
            <p className="text-sm font-black uppercase text-vault-green">Create Community</p>
            <h1 className="mt-2 text-4xl font-black leading-tight lg:text-5xl">Create Community</h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300">Launch a token-backed faction with vault NFTs, raids, and staking.</p>
            <div className="mt-8 grid gap-2 md:grid-cols-5">
              {steps.map((step, index) => (
                <div key={step} className={cn("rounded-md border px-3 py-3 text-sm font-black transition", index <= activeStep ? "border-vault-green/70 bg-vault-green/14 text-vault-green shadow-green" : "border-vault-line bg-black/35 text-slate-500")}>
                  <span className="mr-2 text-xs">{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? <ProductNotice tone="red" message={error} /> : null}
        {walletAuth.error ? <ProductNotice tone="red" message={walletAuth.error} /> : null}
        <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <SectionCard title="Launch Brief" className="p-5">
              <div className="space-y-4">
                <Field label="Token CA / mint address" value={tokenMint} onChange={(value) => { setTokenMint(value); setScan(null); }} placeholder="Solana token mint address" />
                <button type="button" onClick={scanToken} disabled={loading || tokenMint.trim().length < 32} className="phew-button phew-button-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-60">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Scan Token
                </button>
                {scan ? <ResolvedTokenCard scan={scan} showDiagnostics={privateDiagnostics} /> : null}
              </div>
            </SectionCard>

            {scan ? (
              <SectionCard title="Optional Overrides" className="p-5">
                <div className="space-y-4">
                  <Field label="Community name override" value={tokenName} onChange={setTokenName} placeholder={scan.name} />
                  <Field label="Token symbol override" value={tokenSymbol} onChange={setTokenSymbol} placeholder={scan.symbol} />
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-300">Description override</span>
                    <textarea className="phew-input mt-2 min-h-28 w-full resize-none rounded-md px-4 py-3 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={scan.description || "Optional collection tone override"} />
                  </label>
                  <Field label="Logo URL override" value={logoUri} onChange={setLogoUri} icon={Upload} placeholder={scan.imageUri || "Optional"} />
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Brand Kit" className="p-5">
              <div className="grid gap-3">
                {presets.slice(0, 4).map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn("group rounded-md border p-4 text-left transition", selectedPreset === preset.id ? "border-vault-green/70 bg-vault-green/12 text-white shadow-green" : "border-vault-line bg-black/30 text-slate-300 hover:border-vault-cyan/40")}
                  >
                    <div className="flex items-start gap-3">
                      <Palette className={cn("mt-1 size-5", selectedPreset === preset.id ? "text-vault-green" : "text-vault-cyan")} />
                      <div>
                        <p className="font-black">{preset.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{preset.artStyle}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {["#baff00", "#16d7d2", "#101a17", "#f4c542", "#f7fbff"].map((color) => (
                  <span key={color} className="h-9 rounded-md border border-white/10" style={{ background: color }} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Vault Collection" className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniControl icon={LockKeyhole} label="Vault visuals" value={isWireframePreview(studioPreview) ? "Pending studio" : "Preview ready"} />
                <MiniControl icon={Swords} label="Raids" value="Enabled" />
                <MiniControl icon={Zap} label="Staking" value="Ready" />
              </div>
              <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="mt-4 flex w-full items-center justify-between rounded-md border border-vault-line bg-black/25 px-4 py-3 text-sm font-bold text-slate-300">
                Advanced token details
                <ChevronDown className={cn("size-4 transition", advancedOpen && "rotate-180")} />
              </button>
              {advancedOpen ? (
                <div className="mt-4 space-y-3 rounded-md border border-vault-line bg-black/25 p-4">
                  <Field label="Community phrases" value={phrases} onChange={setPhrases} placeholder="Comma separated" />
                  <Field label="Faction archetype" value={mascotPreference} onChange={setMascotPreference} placeholder="Vault knights, cyber reapers, etc." />
                  <Field label="Mood" value={mood} onChange={setMood} placeholder="Dark, elite, high-energy" />
                  <Field label="Community lore notes" value={memes} onChange={setMemes} placeholder="Optional context, not shown as debug UI" />
                </div>
              ) : null}
            </SectionCard>

            <div className="grid gap-3">
              <ConceptPlanNotice plan={conceptPlan} />
              <button type="button" onClick={generatePreview} disabled={loading || !canGenerateAiConcept} className="phew-button phew-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Fast Studio Preview
              </button>
              <button type="button" onClick={createRun} disabled={loading || !canSaveDraft} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-cyan/50 bg-vault-cyan/10 px-5 text-sm font-bold text-vault-cyan disabled:opacity-45">
                <ShieldCheck className="size-4" /> Save Launch Draft
              </button>
            </div>
          </aside>

          <main className="space-y-6">
            <LiveLaunchPreview preview={studioPreview} launchResult={launchResult} />
            <StyleBibleStudioPanel preview={studioPreview} />
            <PremiumCinematicPanel preview={studioPreview} />

            <CreatorStudioStatusPanel preview={studioPreview} setup={setup} loading={loading || capabilityState.loading} showDiagnostics={privateDiagnostics} />
            <CuratedLayerPackManager
              preview={studioPreview}
              rootPath={layerPackRoot}
              exportCount={exportCount}
              loading={loading}
              disabled={!run || loading}
              onRootPathChange={setLayerPackRoot}
              onExportCountChange={setExportCount}
              onImport={importLayerPack}
              onExport={exportLayerPack}
            />
            {privateDiagnostics && advancedOpen ? (
              <SetupChecklistPanel
                setup={setup}
                modes={capabilityState.data?.setupModes ?? []}
                capabilities={capabilities ?? {}}
                loading={loading || capabilityState.loading}
                message={setupActionMessage}
                onGenerateAiConcept={generatePreview}
                onUseDemoPack={useDemoCuratedLayerPack}
                onAttachLayerPack={attachCuratedLayerPack}
                onValidateProgram={() => validateSetup("program")}
                onValidateStorage={() => validateSetup("storage")}
                canGenerateAiConcept={canGenerateAiConcept}
              />
            ) : null}

            <StudioWorkflowPanel
              workflow={studioPreview.studioWorkflow}
              disabled={!run || loading}
              hasRun={Boolean(run)}
              onAction={studioAction}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <SectionCard title="Launch Readiness" className="p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <ReadinessItem label="Brand direction" complete={Boolean(tokenName || preview)} />
                  <ReadinessItem label="Studio Bible ready" complete={hasAllStudioBibleAssets(preview)} />
                  <ReadinessItem label="Quality reviewed" complete={Boolean(latestQuality?.passed && latestQuality.tier !== "BASIC")} />
                  <ReadinessItem label="Studio approvals" complete={studioApprovalsComplete} />
                  <ReadinessItem label="Founder approval" complete={approvalConfirmed} />
                </div>
                <label className="mt-4 flex items-start gap-3 rounded-md border border-vault-green/30 bg-vault-green/8 p-4 text-sm text-slate-200">
                  <input className="mt-1 accent-[#baff00]" type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} />
                  <span>I understand studio previews need locked creator approval plus layered, curated, or artist-approved production assets before launch.</span>
                </label>
              </SectionCard>

              <SectionCard title="Launch Actions" className="p-5">
                <div className="space-y-3">
                  <button type="button" onClick={() => mutateRun("regenerate-style")} disabled={!run || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-cyan/40 bg-vault-cyan/8 text-sm font-bold text-vault-cyan disabled:opacity-45">
                    <RefreshCcw className="size-4" /> Refine Style
                  </button>
                  <button type="button" onClick={() => mutateRun("regenerate-previews")} disabled={!run || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-line bg-black/30 text-sm font-bold disabled:opacity-45">
                    <Wand2 className="size-4 text-vault-green" /> Refresh Studio Sheets
                  </button>
                  <button type="button" onClick={() => mutateRun("premium-cinematic")} disabled={!run || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-gold/45 bg-vault-gold/10 text-sm font-bold text-vault-gold disabled:opacity-45">
                    <Sparkles className="size-4" /> Premium Cinematic Render
                  </button>
                  <button type="button" onClick={approveRun} disabled={!canApprove || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-green/50 bg-vault-green/10 text-sm font-bold text-vault-green disabled:opacity-45">
                    <ShieldCheck className="size-4" /> Approve Production Assets
                  </button>
                  <button type="button" onClick={launchCollection} disabled={!run || run.status !== "APPROVED" || loading || !launchEnvironmentReady || preview?.curatedLayerPack?.status !== "EXPORT_READY"} className="phew-button phew-button-primary flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-black text-black disabled:opacity-45">
                    <Check className="size-4" /> Launch Collection
                  </button>
                </div>
              </SectionCard>
            </div>

            <CollectionPreview preview={studioPreview} compact={!preview} onGenerateAiConcept={generatePreview} canGenerateAiConcept={canGenerateAiConcept} loading={loading} />
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function SetupChecklistPanel({
  setup,
  modes,
  capabilities,
  loading,
  message,
  canGenerateAiConcept,
  onGenerateAiConcept,
  onUseDemoPack,
  onAttachLayerPack,
  onValidateProgram,
  onValidateStorage
}: {
  setup?: SetupChecklist;
  modes: SetupMode[];
  capabilities: SystemCapabilities;
  loading: boolean;
  message: string | null;
  canGenerateAiConcept: boolean;
  onGenerateAiConcept: () => void;
  onUseDemoPack: () => void;
  onAttachLayerPack: () => void;
  onValidateProgram: () => void;
  onValidateStorage: () => void;
}) {
  const checklist = setup?.items ?? defaultSetupItems();
  return (
    <SectionCard title="Private Setup Diagnostics" className="p-5">
      <div className="grid gap-3 lg:grid-cols-3">
        {modes.map((mode) => (
          <div key={mode.id} className={cn("rounded-md border p-4", mode.ready ? "border-vault-green/45 bg-vault-green/8" : "border-vault-gold/35 bg-vault-gold/8")}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-black text-white">{mode.label}</p>
              <StatusPill accent={mode.ready ? "green" : "gold"}>{mode.ready ? "Ready" : "Setup needed"}</StatusPill>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">{mode.output}</p>
            {mode.missing.length ? <p className="mt-3 text-xs font-bold text-vault-gold">Missing: {mode.missing.join(", ")}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {checklist.map((item) => (
          <SetupChecklistItem key={item.key} item={item} />
        ))}
      </div>

      {capabilities.demoCuratedLayerPackAllowed ? (
        <p className="mt-4 rounded-md border border-vault-gold/30 bg-vault-gold/8 px-3 py-2 text-xs font-bold text-vault-gold">DEMO_CURATED_LAYER_PACK is active: devnet demo only. Production launch remains blocked until real curated or artist-approved assets are attached.</p>
      ) : null}
      {message ? <p className="mt-4 rounded-md border border-vault-cyan/30 bg-vault-cyan/8 px-3 py-2 text-xs font-bold text-vault-cyan">{message}</p> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ActionButton icon={Sparkles} label="Fast Studio Preview" disabled={loading || !canGenerateAiConcept} onClick={onGenerateAiConcept} primary />
        <ActionButton icon={Wand2} label="Use Demo Curated Layer Pack for Devnet" disabled={loading} onClick={onUseDemoPack} />
        <ActionButton icon={Upload} label="Upload/Attach Curated Layer Pack" disabled={loading} onClick={onAttachLayerPack} />
        <ActionButton icon={RadioTower} label="Validate Program ID" disabled={loading} onClick={onValidateProgram} />
        <ActionButton icon={ShieldCheck} label="Validate Storage" disabled={loading} onClick={onValidateStorage} />
      </div>
    </SectionCard>
  );
}

function PublicReadinessPanel({ setup, loading, canGenerateAiConcept, onGenerateAiConcept }: { setup?: SetupChecklist; loading: boolean; canGenerateAiConcept: boolean; onGenerateAiConcept: () => void }) {
  const launchReady = Boolean(setup?.devnetLaunchReady || setup?.productionLaunchReady);
  const creativeReady = Boolean(setup?.creativePreviewReady);
  return (
    <SectionCard title="Readiness Summary" className="p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PublicReadinessItem label="Studio preview" value={creativeReady ? "Creative DNA ready" : "Studio preview not ready yet"} ready={creativeReady} />
        <PublicReadinessItem label="Launch" value={launchReady ? "Launch path available" : "Launch is not available yet"} ready={launchReady} />
        <PublicReadinessItem label="Minting" value={launchReady ? "Minting setup ready" : "Minting is temporarily unavailable"} ready={launchReady} />
        <PublicReadinessItem label="Creator setup" value={launchReady ? "Ready for review" : "Creator setup required"} ready={launchReady} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onGenerateAiConcept} disabled={loading || !canGenerateAiConcept} className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-55">
          <Sparkles className="size-4" /> Fast Studio Preview
        </button>
      </div>
    </SectionCard>
  );
}

function PublicReadinessItem({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className={cn("rounded-md border p-4", ready ? "border-vault-green/35 bg-vault-green/8" : "border-vault-line bg-black/25")}>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className={cn("mt-2 text-sm font-bold", ready ? "text-vault-green" : "text-slate-200")}>{value}</p>
    </div>
  );
}

function CreatorStudioStatusPanel({ preview, setup, loading, showDiagnostics }: { preview: CollectionGeneratorPreview; setup?: SetupChecklist; loading: boolean; showDiagnostics: boolean }) {
  const previewReady = hasAllStudioBibleAssets(preview);
  const devLaunchReady = Boolean(setup?.devnetLaunchReady || setup?.productionLaunchReady);
  const productionReady = preview.curatedLayerPack?.status === "VALID" || preview.curatedLayerPack?.status === "EXPORT_READY" || preview.productionAssetStatus === "FINAL_PRODUCTION" || preview.productionAssetStatus === "ARTIST_APPROVED" || preview.productionAssetStatus === "CURATED_LAYER_READY";
  const providerReason = exactGenerationReason(preview) ?? preview.providerStatus;
  return (
    <SectionCard title="Studio Status" className="p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SimpleCreatorStatus label="Studio Bible" value={loading ? "Working" : previewReady ? "All five sheets ready" : "Art direction incomplete"} ok={previewReady} />
        <SimpleCreatorStatus label="Dev launch" value={devLaunchReady ? "Available" : "Dev launch unavailable"} ok={devLaunchReady} />
        <SimpleCreatorStatus label="Final layers" value={productionReady ? "Approved layer manifest ready" : "Approved transparent layers required"} ok={productionReady} />
      </div>
      {!previewReady && providerReason ? (
        <p className="mt-4 rounded-md border border-vault-gold/30 bg-vault-gold/8 px-3 py-2 text-xs font-bold leading-5 text-vault-gold">
          Studio Bible generation unavailable - provider reason: {providerReason}
        </p>
      ) : null}
      {!previewReady && preview.conceptRequest?.noBillableGenerationAttempted ? (
        <p className="mt-3 rounded-md border border-vault-gold/30 bg-vault-gold/8 px-3 py-2 text-xs font-black text-vault-gold">
          No billable generation attempted
        </p>
      ) : null}
      {showDiagnostics && preview.conceptRequest?.diagnostics ? <StudioProviderDiagnosticsPanel diagnostics={preview.conceptRequest.diagnostics} /> : null}
    </SectionCard>
  );
}

function StudioProviderDiagnosticsPanel({ diagnostics }: { diagnostics: NonNullable<ConceptRequestSummary["diagnostics"]> }) {
  const rows = [
    ["STUDIO_PROVIDER", diagnostics.envStudioProvider],
    ["STUDIO_IMAGE_PROVIDER", diagnostics.envStudioImageProvider],
    ["GEMINI_API_KEY present", diagnostics.geminiApiKeyPresent === undefined ? undefined : String(diagnostics.geminiApiKeyPresent)],
    ["Imagen key present", diagnostics.imagenApiKeyPresent === undefined ? undefined : String(diagnostics.imagenApiKeyPresent)],
    ["Model selected", diagnostics.modelSelected],
    ["Gemini text model", diagnostics.geminiTextModelSelected],
    ["Prompt provider", diagnostics.promptProvider],
    ["Prompt branch", diagnostics.promptProviderDecisionBranch],
    ["Prompt fallback", diagnostics.promptFallbackReason],
    ["Route called", diagnostics.routeCalled],
    ["Provider branch", diagnostics.providerDecisionBranch],
    ["Active image provider", diagnostics.activeImageProvider],
    ["Active image model", diagnostics.activeImageModel],
    ["Fallback model used", diagnostics.fallbackModelUsed],
    ["Attempted models", diagnostics.attemptedModels?.join(", ")],
    ["Disabled models", diagnostics.disabledModels?.join(", ")],
    ["Unsupported models", diagnostics.unsupportedModels?.join(", ")],
    ["Quota status", diagnostics.quotaStatus],
    ["Last probe", diagnostics.lastProbeResult],
    ["Last error", diagnostics.lastErrorCode],
    ["Cache", diagnostics.cacheStatus],
    ["Fallback reason", diagnostics.fallbackReason],
    ["OpenAI fallback enabled", diagnostics.openaiStudioFallbackEnabled === undefined ? undefined : String(diagnostics.openaiStudioFallbackEnabled)],
    ["Can generate Studio Bible", diagnostics.canGenerateStudioBible === undefined ? undefined : String(diagnostics.canGenerateStudioBible)],
    ["No billable generation attempted", diagnostics.noBillableGenerationAttempted === undefined ? undefined : String(diagnostics.noBillableGenerationAttempted)],
    ["Studio generation enabled", diagnostics.studioImageGenerationEnabled === undefined ? undefined : String(diagnostics.studioImageGenerationEnabled)]
  ].filter(([, value]) => value !== undefined && value !== "");
  return (
    <details className="mt-4 rounded-md border border-vault-line bg-black/30 p-4">
      <summary className="cursor-pointer text-xs font-black uppercase text-slate-400">Provider diagnostics</summary>
      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-300 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <p key={label}>{label}: <span className="text-white">{value}</span></p>
        ))}
      </div>
    </details>
  );
}

function SimpleCreatorStatus({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={cn("rounded-md border p-4", ok ? "border-vault-green/40 bg-vault-green/8" : "border-vault-line bg-black/30")}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={cn("mt-2 text-sm font-black", ok ? "text-vault-green" : "text-slate-300")}>{value}</p>
    </div>
  );
}

function StudioWorkflowPanel({ workflow, disabled, hasRun, onAction }: { workflow?: StudioWorkflowState; disabled: boolean; hasRun: boolean; onAction: (action: StudioWorkflowActionName, target?: string) => void }) {
  const state = workflow ?? defaultStudioWorkflow();
  const lockItems = [
    ["Art direction", state.locks.artDirection, "lock-art-direction"],
    ["Style", state.locks.style, "lock-style"],
    ["Mood", state.locks.mood, "lock-mood"],
    ["Rarity direction", state.locks.rarityDirection, "lock-rarity-direction"]
  ] as const;
  const approvalItems = [
    ["Silhouette system", state.approvals.silhouetteSystem, "approve-silhouette-system"],
    ["Faction culture", state.approvals.factionCulture, "approve-faction-culture"],
    ["Trait family", state.approvals.traitFamily, "approve-trait-family"],
    ["Cinematic direction", state.approvals.cinematicDirection, "approve-cinematic-direction"]
  ] as const;
  return (
    <SectionCard title="Premium Studio Workflow" className="p-5">
      {!hasRun ? <p className="mb-4 rounded-md border border-vault-line bg-black/25 px-3 py-2 text-xs font-bold text-slate-400">Draft not saved</p> : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_.9fr]">
        <StudioGroup title="Locks">
          {lockItems.map(([label, active, actionName]) => (
            <StudioActionButton key={actionName} icon={LockKeyhole} label={active ? `${label} locked` : `Lock ${label.toLowerCase()}`} active={active} disabled={disabled || active} onClick={() => onAction(actionName)} />
          ))}
        </StudioGroup>
        <StudioGroup title="Approvals">
          {approvalItems.map(([label, active, actionName]) => (
            <StudioActionButton key={actionName} icon={ShieldCheck} label={active ? `${label} approved` : `Approve ${label.toLowerCase()}`} active={active} disabled={disabled || active} onClick={() => onAction(actionName)} />
          ))}
        </StudioGroup>
        <StudioGroup title="Selective Regeneration">
          <div className="grid grid-cols-3 gap-2">
            {["Rare", "Epic", "Legendary"].map((rarity) => (
              <button key={rarity} type="button" onClick={() => onAction("regenerate-rarity-tier", rarity)} disabled={disabled || state.locks.rarityDirection} className="min-h-10 rounded-md border border-vault-cyan/35 bg-vault-cyan/8 px-2 text-xs font-black text-vault-cyan disabled:opacity-45">
                {rarity}
              </button>
            ))}
          </div>
          <StudioActionButton icon={RefreshCcw} label={`Regenerate mood set${state.rerolls.moodSet ? ` (${state.rerolls.moodSet})` : ""}`} active={false} disabled={disabled || state.locks.mood} onClick={() => onAction("regenerate-mood-set")} />
          <StudioActionButton icon={Sparkles} label={`Regenerate legendary scene${state.rerolls.legendaryScene ? ` (${state.rerolls.legendaryScene})` : ""}`} active={false} disabled={disabled || state.approvals.cinematicDirection} onClick={() => onAction("regenerate-legendary-scene")} />
          {state.lastAction ? <p className="rounded-md border border-vault-line bg-black/25 px-3 py-2 text-[11px] font-bold uppercase text-slate-500">Last: {cleanDisplayText(state.lastAction.action)}{state.lastAction.target ? ` / ${state.lastAction.target}` : ""}</p> : null}
        </StudioGroup>
      </div>
    </SectionCard>
  );
}

function StudioGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-md border border-vault-line bg-black/25 p-3">
      <p className="text-xs font-black uppercase text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function CuratedLayerPackManager({
  preview,
  rootPath,
  exportCount,
  loading,
  disabled,
  onRootPathChange,
  onExportCountChange,
  onImport,
  onExport
}: {
  preview: CollectionGeneratorPreview;
  rootPath: string;
  exportCount: number;
  loading: boolean;
  disabled: boolean;
  onRootPathChange: (value: string) => void;
  onExportCountChange: (value: number) => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const pack = preview.curatedLayerPack;
  const validation = asRecord<unknown>(pack?.validation);
  const errors = asArray(validation.errors);
  const warnings = asArray(validation.warnings);
  const exportInfo = asRecord<unknown>(validation.deterministicExport);
  const categoryCounts = pack?.assets?.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.category] = (acc[asset.category] ?? 0) + 1;
    return acc;
  }, {}) ?? {};
  const valid = pack?.status === "VALID" || pack?.status === "EXPORT_READY";
  const exportReady = pack?.status === "EXPORT_READY";
  return (
    <SectionCard title="Curated Layer Pack Manager" className="p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill accent={valid ? "green" : "gold"}>{pack ? pack.status : "No layer pack"}</StatusPill>
            <StatusPill accent={exportReady ? "green" : "gold"}>{exportReady ? "Deterministic export ready" : "Art direction only"}</StatusPill>
            {pack?.provenanceHash ? <StatusPill accent="cyan">Provenance {short(pack.provenanceHash)}</StatusPill> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
            <Field label="Layer pack root path" value={rootPath} onChange={onRootPathChange} placeholder="C:\\art\\my-pack or /packs/my-pack" />
            <label className="block text-sm">
              <span className="mb-2 block text-xs font-black uppercase text-slate-500">Export count</span>
              <input type="number" min={1} max={10000} value={exportCount} onChange={(event) => onExportCountChange(Math.max(1, Math.min(10000, Number(event.target.value) || 1)))} className="w-full rounded-md border border-vault-line bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-vault-green" />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onImport} disabled={disabled || !rootPath.trim()} className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-black disabled:opacity-45">
              <Upload className="size-4" /> Import Curated Layers
            </button>
            <button type="button" onClick={onExport} disabled={disabled || !valid} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green disabled:opacity-45">
              <ShieldCheck className="size-4" /> Build Deterministic Export
            </button>
          </div>
          {errors.length ? <p className="rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-200">Validation errors: {errors.join(" ")}</p> : null}
          {warnings.length ? <p className="rounded-md border border-vault-gold/35 bg-vault-gold/8 px-3 py-2 text-xs font-bold leading-5 text-vault-gold">Warnings: {warnings.join(" ")}</p> : null}
          {exportInfo.provenanceHash ? <p className="rounded-md border border-vault-green/35 bg-vault-green/8 px-3 py-2 text-xs font-bold text-vault-green">Last export: {exportInfo.count ? `${exportInfo.count} assets` : "ready"} / {String(exportInfo.provenanceHash)}</p> : null}
        </div>
        <div className="space-y-3">
          {pack?.previewUri ? (
            <div className="overflow-hidden rounded-md border border-[#15110a] bg-[#ede5d4] p-2">
              <img src={pack.previewUri} alt={`${pack.name} compositor preview`} className="aspect-square w-full rounded-sm border border-black/20 object-cover" />
            </div>
          ) : (
            <div className="grid aspect-square place-items-center rounded-md border border-dashed border-vault-line bg-black/25 p-4 text-center text-xs font-bold text-slate-400">Import transparent PNG/WebP layers to preview deterministic composition.</div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(categoryCounts).slice(0, 8).map(([category, count]) => (
              <div key={category} className="rounded-md border border-vault-line bg-black/25 p-2">
                <p className="text-[10px] font-black uppercase text-slate-500">{category}</p>
                <p className="text-lg font-black text-white">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function StudioActionButton({ icon: Icon, label, active, disabled, onClick }: { icon: typeof LockKeyhole; label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black disabled:opacity-45", active ? "border-vault-green/50 bg-vault-green/12 text-vault-green" : "border-vault-line bg-black/30 text-slate-200 hover:border-vault-cyan/45")}>
      <Icon className={cn("size-4 shrink-0", active ? "text-vault-green" : "text-vault-cyan")} />
      <span>{label}</span>
    </button>
  );
}

function defaultStudioWorkflow(): StudioWorkflowState {
  return {
    locks: { artDirection: false, style: false, mood: false, rarityDirection: false },
    approvals: { silhouetteSystem: false, factionCulture: false, traitFamily: false, cinematicDirection: false },
    rerolls: { rarityTiers: {}, moodSet: 0, legendaryScene: 0 }
  };
}

function ConceptPlanNotice({ plan }: { plan: ConceptRequestSummary | null }) {
  if (!plan) {
    return (
      <div className="rounded-md border border-vault-line bg-black/25 px-4 py-3 text-xs font-bold text-slate-400">
        Scan a token to estimate Fast Studio Preview assets and cost.
      </div>
    );
  }
  const paid = Boolean(plan.usesPaidOpenAIImageGeneration);
  const imagesThisRun = plan.imagesThisRun ?? plan.imageCount ?? 0;
  return (
    <div className="rounded-md border border-vault-cyan/25 bg-black/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill accent={paid ? "gold" : "green"}>{paid ? "Premium Cinematic" : "Fast Studio Preview"}</StatusPill>
        {plan.lowCostMode ? <StatusPill accent="cyan">Low preview cost</StatusPill> : null}
        {plan.cachedResultAvailable || plan.cacheStatus === "hit" ? <StatusPill accent="green">Cached available</StatusPill> : <StatusPill accent="gold">No cache yet</StatusPill>}
        {plan.providerFailureCode ? <StatusPill accent="gold">{plan.providerFailureCode}</StatusPill> : null}
      </div>
      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-300">
        <p>Provider: <span className="text-white">{providerDisplay(plan.provider)}</span></p>
        {plan.activeImageProvider ? <p>Active image provider: <span className="text-white">{providerDisplay(plan.activeImageProvider)}</span></p> : null}
        {plan.activeModel ? <p>Active model: <span className="text-white">{plan.activeModel}</span></p> : null}
        {plan.fallbackModelUsed ? <p>Fallback model used: <span className="text-white">{plan.fallbackModelUsed}</span></p> : null}
        <p>Images this run: <span className="text-white">{imagesThisRun}</span></p>
        <p>Estimated cost: <span className={paid ? "text-vault-gold" : "text-vault-green"}>{formatUsd(plan.estimatedCostUsd)}</span></p>
        {plan.model ? <p>Model: <span className="text-white">{plan.model}</span></p> : null}
        {plan.cacheStatus ? <p>Cache status: <span className="text-white">{plan.cacheStatus}</span></p> : null}
        {plan.providerFailureCode || plan.unavailableReason ? <p>Provider reason: <span className="text-vault-gold">{plan.unavailableReason ?? plan.providerFailureCode}</span></p> : null}
        {plan.noBillableGenerationAttempted ? <p>No billable generation attempted: <span className="text-vault-gold">true</span></p> : null}
        {plan.generationType ? <p>Generation type: <span className="text-white">{generationTypeLabel(plan.generationType)}</span></p> : null}
      </div>
    </div>
  );
}

function providerDisplay(provider?: string) {
  if (!provider) return "Automatic fallback";
  if (/cached-imagen/i.test(provider)) return "Cached Imagen";
  if (/imagen/i.test(provider) && /unavailable/i.test(provider)) return "Imagen unavailable";
  if (/imagen/i.test(provider)) return "Imagen Studio";
  if (/cached-gemini/i.test(provider)) return "Cached Gemini";
  if (/unavailable|no-studio-sheets/i.test(provider)) return "Gemini unavailable";
  if (/gemini/i.test(provider)) return "Gemini Studio";
  if (/openai/i.test(provider)) return "OpenAI Studio fallback";
  if (/cached/i.test(provider)) return "Cached studio preview";
  if (/deterministic/i.test(provider)) return "Deterministic dev fallback";
  if (/premium-fallback|fallback-poster/i.test(provider)) return "Fallback art hidden";
  if (/local-placeholder|planning/i.test(provider)) return "Legacy preview hidden";
  return cleanDisplayText(provider);
}

function generationTypeLabel(value?: string) {
  if (!value) return "Studio asset";
  if (value === "fast_studio_preview") return "Fast Studio Preview";
  if (value === "premium_cinematic_render") return "Premium Cinematic Render";
  return cleanDisplayText(value.replaceAll("_", " "));
}

function formatUsd(value: unknown) {
  const amount = numberFrom(value);
  if (amount === undefined) return "$0.00";
  if (amount === 0) return "$0.00";
  return amount < 0.01 ? "<$0.01" : `$${amount.toFixed(2)}`;
}

function hasAllStudioBibleAssets(preview: CollectionGeneratorPreview | null | undefined) {
  return hasRealStudioBibleAssets(preview);
}

function assetProvider(asset: StudioPreviewAsset) {
  return studioAssetProvider(asset);
}

function exactGenerationReason(preview: CollectionGeneratorPreview) {
  const warning = preview.warnings?.find((item) => /(?:IMAGEN|GEMINI)_(?:KEY_MISSING|DISABLED|REQUEST_FAILED|QUOTA_EXCEEDED|MODEL_UNSUPPORTED|TIMEOUT)|(?:AI|Imagen|Gemini|Studio Bible|studio) (?:concept|studio|generation|image)?\s*unavailable/i.test(item));
  if (!warning) return preview.conceptRequest?.unavailableReason ?? preview.conceptRequest?.providerFailureReason ?? preview.conceptRequest?.providerFailureCode;
  return warning.replace(/^AI (?:concept|studio) generation unavailable:\s*/i, "Studio generation unavailable: ");
}

function SetupChecklistItem({ item }: { item: SetupChecklist["items"][number] }) {
  return (
    <div className={cn("rounded-md border p-3", item.ok ? "border-vault-green/35 bg-vault-green/8" : "border-vault-line bg-black/25")}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-md", item.ok ? "bg-vault-green text-black" : "bg-white/5 text-slate-500")}>{item.ok ? <Check className="size-4" /> : <RadioTower className="size-4" />}</span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-black text-white">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{item.ok ? "Configured" : item.fix}</p>
          <p className="mt-1 text-[11px] font-bold uppercase text-slate-500">{item.requiredFor.join(" / ")}</p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, disabled, onClick, primary = false }: { icon: typeof Sparkles; label: string; disabled: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-black disabled:opacity-45", primary ? "phew-button phew-button-primary text-black" : "border border-vault-cyan/35 bg-vault-cyan/8 text-vault-cyan")}>
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function defaultSetupItems(): SetupChecklist["items"] {
  return [
    "STUDIO_PROVIDER",
    "STUDIO_IMAGE_PROVIDER",
    "IMAGEN_IMAGE_MODEL",
    "GEMINI_IMAGE_MODEL",
    "GEMINI_API_KEY",
    "ENABLE_STUDIO_IMAGE_GENERATION",
    "CINEMATIC_PROVIDER",
    "PROGRAM_ID",
    "SOLANA_RPC_URL",
    "SOLANA_TRANSACTION_PROVIDER",
    "PINATA_JWT or storage provider",
    "approved curated layer pack"
  ].map((label) => ({
    key: label,
    label,
    ok: false,
    requiredFor: ["Setup"],
    fix: "Capability data is loading."
  }));
}

function StyleBibleStudioPanel({ preview }: { preview: CollectionGeneratorPreview }) {
  const bible = preview.styleBible;
  const assetsByType = new Map(
    realStudioBibleAssetsFromPreview(preview)
      .map((asset) => [asset!.type, asset!])
  );
  const orderedAssets = studioBibleAssetTypes.map((type) => assetsByType.get(type)).filter(Boolean) as StudioPreviewAsset[];
  const missingAssets = studioBibleAssetTypes.filter((type) => !assetsByType.get(type)?.uri);
  const providerReason = exactGenerationReason(preview) ?? preview.providerStatus;
  if (!orderedAssets.length) {
    return (
      <SectionCard title="NFT Studio Bible" className="p-5">
        <div className="rounded-md border border-dashed border-vault-line bg-black/30 p-6 text-sm text-slate-300">
          {providerReason
            ? `Studio Bible generation unavailable - provider reason: ${providerReason}`
            : "Run Fast Studio Preview to build collection DNA, art team selection, trait catalog, rarity ladder, mood sheet, layer plan, and export manifest."}
        </div>
      </SectionCard>
    );
  }
  const qa = bible?.qaReport;
  const exportItems = bible ? [bible.exportPlan.styleBibleJson, bible.exportPlan.traitCatalogJson, bible.exportPlan.metaplexCandyMachineConfig, bible.exportPlan.genericZip] : [];
  return (
    <SectionCard title="NFT Studio Bible" className="overflow-hidden p-0">
      <div className="border-b border-vault-line bg-black/65 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill accent="green">{preview.artTeam?.id ?? bible?.artTeam.id ?? "STUDIO BIBLE"}</StatusPill>
          {qa ? <StatusPill accent={qa.passed ? "green" : "gold"}>{qa.passed ? "Studio QA pass" : "Needs studio pass"}</StatusPill> : null}
          {preview.providerStatus ? <StatusPill accent="cyan">{providerDisplay(preview.providerStatus)}</StatusPill> : null}
          <StatusPill accent={missingAssets.length ? "gold" : "green"}>{missingAssets.length ? "Studio sheets incomplete" : "All Studio sheets ready"}</StatusPill>
          {preview.conceptRequest?.estimatedCostUsd !== undefined ? <StatusPill accent="cyan">{formatUsd(preview.conceptRequest.estimatedCostUsd)}</StatusPill> : null}
        </div>
        <h3 className="mt-3 text-3xl font-black text-white">{bible?.collectionName ?? preview.collection}</h3>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300">{bible?.artTeam.traitPhilosophy ?? "Studio sheets render collection DNA, traits, rarity, mood, layers, and export readiness as first-class creator review assets."}</p>
        {missingAssets.length ? <p className="mt-3 rounded-md border border-vault-gold/30 bg-vault-gold/8 px-3 py-2 text-xs font-bold text-vault-gold">Missing Studio Bible assets: {missingAssets.map((type) => type.replaceAll("_", " ")).join(", ")}.</p> : null}
      </div>
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <div className="space-y-4 bg-[#1a1710] p-4">
          {assetsByType.get("STYLE_BIBLE")?.uri ? <StudioAssetFrame asset={assetsByType.get("STYLE_BIBLE")!} large /> : null}
          {orderedAssets.filter((asset) => asset.type !== "STYLE_BIBLE").length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {orderedAssets.filter((asset) => asset.type !== "STYLE_BIBLE").map((asset) => <StudioAssetFrame key={asset.type} asset={asset} />)}
            </div>
          ) : null}
        </div>
        <div className="space-y-5 bg-black/45 p-5">
          {qa ? (
            <div className="grid grid-cols-2 gap-2">
              <StudioMetric label="Trait coverage" value={preview.traitCoverageScore ?? qa.traitCoverageScore} />
              <StudioMetric label="Rarity diversity" value={preview.rarityDiversityScore ?? qa.rarityDiversityScore} />
              <StudioMetric label="Art-team consistency" value={qa.artTeamConsistencyScore} />
              <StudioMetric label="Native mythology" value={qa.collectionNativeArchetypeScore} />
            </div>
          ) : null}

          {bible ? (
            <>
              <StudioList title="Collection DNA" items={bible.collectionDNA.slice(0, 5)} />
              <StudioList title="Mood System" items={bible.moodVocabulary.slice(0, 9)} compact />

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-vault-green">Rarity Ladder</p>
                <div className="mt-3 grid gap-2">
                  {bible.rarityLadder.map((item) => (
                    <div key={item.rarity} className="rounded-md border border-vault-line bg-black/35 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-white">{item.rarity}</p>
                        <span className="text-[11px] font-black text-vault-green">{item.supplyTarget}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{[item.base, item.head, item.eyes, item.mouth, item.body, item.prop, item.background].filter(Boolean).join(" / ")}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StudioList title="Export Manifest" items={exportItems} />
            </>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function StudioAssetFrame({ asset, large = false }: { asset: StudioPreviewAsset; large?: boolean }) {
  const provider = assetProvider(asset);
  const generationType = asset.generationType ?? stringFrom(asset.metadata?.generationType) ?? stringFrom(asset.generationMetadata?.generationType);
  const cacheStatus = asset.cacheStatus ?? stringFrom(asset.metadata?.cacheStatus) ?? stringFrom(asset.generationMetadata?.cacheStatus);
  const estimatedCostUsd = asset.estimatedCostUsd ?? numberFrom(asset.metadata?.estimatedCostUsd ?? asset.generationMetadata?.estimatedCostUsd);
  return (
    <figure className="rounded-md border border-[#15110a] bg-[#ede5d4] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-black/20 pb-2">
        <figcaption className="text-xs font-black uppercase tracking-[0.16em] text-black">{asset.label}</figcaption>
        <span className="rounded-sm bg-black px-2 py-1 text-[10px] font-black uppercase text-[#baff00]">{asset.type.replaceAll("_", " ")}</span>
      </div>
      <img src={asset.uri} alt={asset.label} className={cn("w-full rounded-sm border border-black/20 bg-[#f4efdf] object-cover", large ? "max-h-[780px]" : "h-72")} />
      <div className="mt-2 grid gap-1 text-[10px] font-black uppercase text-black/65 sm:grid-cols-3">
        <span>{providerDisplay(provider)}</span>
        <span>{generationTypeLabel(generationType)}</span>
        <span>{cacheStatus ? `Cache ${cacheStatus}` : formatUsd(estimatedCostUsd)}</span>
      </div>
    </figure>
  );
}

function PremiumCinematicPanel({ preview }: { preview: CollectionGeneratorPreview }) {
  const hero = preview.studioAssets?.find((asset) => asset.type === "HERO_CONCEPT");
  if (!hero?.uri) return null;
  return (
    <SectionCard title="Premium Cinematic Render" className="p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <StudioAssetFrame asset={hero} large />
        <div className="rounded-md border border-vault-gold/35 bg-vault-gold/8 p-4">
          <StatusPill accent="gold">OpenAI explicit only</StatusPill>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-200">
            This key-art render is optional marketing art. It is not a Studio Bible sheet, not a transparent layer asset, and not used for deterministic 10k export.
          </p>
          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-300">
            <p>Provider: <span className="text-white">{providerDisplay(assetProvider(hero))}</span></p>
            <p>Estimated cost: <span className="text-vault-gold">{formatUsd(hero.estimatedCostUsd ?? hero.metadata?.estimatedCostUsd ?? hero.generationMetadata?.estimatedCostUsd)}</span></p>
            <p>Generation type: <span className="text-white">{generationTypeLabel(hero.generationType ?? stringFrom(hero.metadata?.generationType) ?? stringFrom(hero.generationMetadata?.generationType))}</span></p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/30 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StudioList({ title, items, compact = false }: { title: string; items: string[]; compact?: boolean }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-vault-green">{title}</p>
      <div className={cn("mt-2 flex flex-wrap gap-2", !compact && "flex-col")}>
        {items.map((item) => (
          <span key={item} className={cn("rounded-md border border-vault-line bg-black/30 px-3 py-2 text-xs font-bold text-slate-300", compact && "py-1")}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function LiveLaunchPreview({ preview, launchResult }: { preview: CollectionGeneratorPreview; launchResult: string | null }) {
  const wireframeOnly = isWireframePreview(preview);
  const tags = identityTags(preview);
  const heroImage = realStudioBibleAssetsFromPreview(preview).find((asset) => asset.type === "STYLE_BIBLE")?.uri ?? "";
  return (
    <section className="phew-panel relative overflow-hidden rounded-lg">
      {heroImage ? <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/88 to-[#020806]/30" />
      <div className="absolute inset-0 grid-mask opacity-25" />
      <div className="relative grid gap-6 p-6 lg:grid-cols-[150px_minmax(0,1fr)_260px] lg:p-7">
        {heroImage ? (
          <div className="aspect-square overflow-hidden rounded-md border border-[#15110a] bg-[#ede5d4] p-2 shadow-green">
            <img src={heroImage} alt={`${preview.collection} studio bible`} className="h-full w-full rounded-sm border border-black/20 object-cover" />
          </div>
        ) : (
          <div className="aspect-square rounded-md border border-dashed border-vault-line bg-black/35 p-4 text-xs font-bold leading-5 text-slate-400">
            Studio Bible generation unavailable{preview.providerStatus ? ` - provider reason: ${preview.providerStatus}` : ""}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill accent="green">{preview.preset || "PHEW Launch Studio"}</StatusPill>
            <StatusPill accent={preview.productionAssetStatus === "FINAL_PRODUCTION" || preview.productionAssetStatus === "ARTIST_APPROVED" || preview.productionAssetStatus === "CURATED_LAYER_READY" ? "green" : "gold"}>{previewStatusLabel(preview)}</StatusPill>
            {launchResult ? <StatusPill accent="cyan">Launched</StatusPill> : null}
          </div>
          <h2 className="mt-4 text-4xl font-black leading-tight">{preview.collection}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{culturePitch(preview)}</p>
          {wireframeOnly ? (
            <div className="mt-3 max-w-2xl rounded-md border border-vault-gold/30 bg-vault-gold/8 px-3 py-2 text-xs font-bold leading-5 text-vault-gold">
              <p>{preview.providerStatus ? `Studio Bible generation unavailable - provider reason: ${preview.providerStatus}` : "Run Fast Studio Preview before reviewing collection visuals."}</p>
              <p className="mt-1">No placeholder NFT art is shown.</p>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-md border border-vault-cyan/25 bg-black/35 px-3 py-2 text-xs font-bold text-vault-cyan">{tag}</span>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <LaunchStat label="Vault supply" value="10,000" />
          <LaunchStat label="Rarity tiers" value="6" />
          <LaunchStat label="Readiness" value={assetStatusLabel(preview.productionAssetStatus)} />
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, icon: Icon, placeholder }: { label: string; value: string; onChange: (value: string) => void; icon?: typeof Upload; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <div className="relative mt-2">
        {Icon ? <Icon className="absolute left-3 top-3 size-4 text-vault-green" /> : null}
        <input className={cn("phew-input h-11 w-full rounded-md px-4 text-sm", Icon && "pl-10")} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

function MiniControl({ icon: Icon, label, value }: { icon: typeof LockKeyhole; label: string; value: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/25 p-3">
      <Icon className="mb-2 size-5 text-vault-green" />
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function ReadinessItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-md border p-3 text-sm", complete ? "border-vault-green/40 bg-vault-green/10 text-white" : "border-vault-line bg-black/25 text-slate-400")}>
      <span className={cn("grid size-7 place-items-center rounded-md", complete ? "bg-vault-green text-black" : "bg-white/5 text-slate-500")}>{complete ? <Check className="size-4" /> : <RadioTower className="size-4" />}</span>
      <span className="font-bold">{label}</span>
    </div>
  );
}

function LaunchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/35 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ProductNotice({ tone, message }: { tone: "red" | "gold"; message: string }) {
  return <div className={cn("rounded-md border p-4 text-sm", tone === "red" ? "border-vault-red/40 bg-vault-red/10 text-vault-red" : "border-vault-gold/40 bg-vault-gold/10 text-vault-gold")}>{message}</div>;
}

function ResolvedTokenCard({ scan, showDiagnostics }: { scan: TokenScan; showDiagnostics: boolean }) {
  const tokenImage = nonLegacyArt(scan.imageUri || scan.logoUri);
  return (
    <div className="rounded-md border border-vault-green/35 bg-vault-green/8 p-4">
      <div className="flex gap-3">
        {tokenImage ? (
          <img src={tokenImage} alt="" className="size-16 rounded-md border border-white/10 object-cover" />
        ) : (
          <div className="grid size-16 place-items-center rounded-md border border-dashed border-white/10 bg-black/30 text-[10px] font-black uppercase text-slate-500">No logo</div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-white">{scan.name}</p>
          <p className="mt-1 text-sm font-bold text-vault-green">{scan.symbol}</p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{scan.description || "No token description returned by metadata provider."}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-300">
        <TokenFact label="Mint" value={short(scan.mint)} />
        <TokenFact label="Metadata URI" value={scan.metadataUri || "Missing"} />
        <TokenFact label="Decimals" value={String(scan.decimals)} />
        <TokenFact label="Supply" value={scan.supply || "Unavailable"} />
      </div>
      {showDiagnostics && scan.riskNotes.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {scan.riskNotes.slice(0, 5).map((note) => (
            <span key={note} className="rounded-md border border-vault-gold/25 bg-vault-gold/8 px-2 py-1 text-[11px] font-bold text-vault-gold">{note}</span>
          ))}
        </div>
      ) : null}
      {showDiagnostics && scan.persistenceWarning ? <p className="mt-3 text-xs text-vault-gold">{scan.persistenceWarning}</p> : null}
    </div>
  );
}

function TokenFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}

function publicCollectionName(preview: CollectionGeneratorPreview) {
  return cleanDisplayText(preview.collection.replace(/^\$/, "")) || "Collection";
}

function culturePitch(preview: CollectionGeneratorPreview) {
  const name = publicCollectionName(preview);
  const source = `${preview.collection} ${preview.theme} ${preview.mascot} ${preview.artStyle} ${preview.backgroundWorld} ${preview.lore} ${preview.traitLanguage.join(" ")}`.toLowerCase();
  if (/hanta|hantavirus|virus|viral|biohazard|quarantine|mutation|containment|toxic|lab/.test(source)) return `${name} is forming a containment faction around quarantine energy, mutated silhouettes, and high-voltage meme lore.`;
  if (/aura|glow|pulse|motion|signal|energy/.test(source)) return `${name} is forming a broadcast-born faction around motion rituals, charged silhouettes, and late-night holder suspense.`;
  if (/market|liquidity|candle|chart|degen|pump|orderbook/.test(source)) return `${name} is forming a trading-floor faction around candlestick shadows, raid momentum, and visible holder status.`;
  const anchors = identityTags(preview).filter((tag) => !/ready|staking|raid/i.test(tag)).slice(0, 3).map((tag) => tag.toLowerCase());
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
  return value.replace(/\s+/g, " ").trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function joinNatural(items: string[]) {
  if (items.length <= 1) return items[0] ?? "community energy";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function fallbackPreview(tokenName: string, tokenSymbol: string, description: string, preset: string): CollectionGeneratorPreview {
  const preview: CollectionGeneratorPreview = {
    id: "studio-preview",
    collection: tokenName.trim() || "PHEW Vault Faction",
    preset: preset || "PHEW Vault Faction",
    theme: "Token-backed vault faction",
    mascot: tokenSymbol.trim() || "PHEW",
    artStyle: "Dark studio vault system",
    palette: ["#baff00", "#16d7d2", "#071017", "#f4c542"],
    backgroundWorld: "Cinematic vault command chamber",
    lore: description.trim() || "A studio faction identity will form here as you define the token, brand kit, vault collection, and launch readiness.",
    raidTheme: "Vault breach raids",
    roleNames: ["Founder", "Vault Raider", "Stake Commander", "Relic Guardian"],
    traitLanguage: ["Obsidian frame", "Lime energy core", "Cyan circuit edge", "Founder seal", "Raid charge", "Vault key"],
    traitCounts: { frame: 18, core: 16, aura: 14, relic: 12, background: 10 },
    rarityWeights: { Common: 6200, Rare: 2400, Epic: 1000, Legendary: 400 },
    unlocks: {},
    assetProvider: "phew-curated-preview",
    previewClassification: "WIREFRAME_CONCEPT",
    productionAssetStatus: "WIREFRAME",
    finalProductionReady: false,
    avatar: "",
    banner: "",
    samples: [],
    quality: {
      previewQualityScore: 84,
      uniquenessScore: 82,
      colorHarmonyScore: 92,
      duplicateRiskScore: 18,
      compatibilityScore: 88,
      tier: "Preview required",
      passed: false
    },
    distinctiveness: {
      silhouetteUniqueness: 84,
      paletteUniqueness: 90,
      mascotUniqueness: 78,
      backgroundWorldUniqueness: 86,
      traitLanguageUniqueness: 82,
      score: 84,
      passed: false
    },
    tenKReadiness: {
      estimated10kFeasible: true,
      possibleUniqueCombinations: "42,000+",
      duplicateRisk: "Low after production trait expansion",
      visualDiversityScore: 84,
      blockers: []
    }
  };
  return preview;
}

function activePreviewAssets(assets: GeneratorRun["styleProfiles"][number]["previewAssets"]) {
  const seen = new Set<string>();
  return assets
    .slice()
    .sort((left, right) => right.version - left.version)
    .filter((asset) => {
      const metadata = asRecord<string>(asset.metadata);
      const key = `${asset.type}:${asset.type === "SAMPLE_NFT" ? metadata.rarity ?? asset.label : asset.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function studioWorkflowFromHints(value: unknown): StudioWorkflowState | undefined {
  const hints = asRecord<unknown>(value);
  const raw = asRecord<unknown>(hints.studioWorkflow);
  if (!Object.keys(raw).length) return undefined;
  const locks = asRecord<unknown>(raw.locks);
  const approvals = asRecord<unknown>(raw.approvals);
  const rerolls = asRecord<unknown>(raw.rerolls);
  const lastAction = asRecord<unknown>(raw.lastAction);
  return {
    locks: {
      artDirection: locks.artDirection === true,
      style: locks.style === true,
      mood: locks.mood === true,
      rarityDirection: locks.rarityDirection === true
    },
    approvals: {
      silhouetteSystem: approvals.silhouetteSystem === true,
      factionCulture: approvals.factionCulture === true,
      traitFamily: approvals.traitFamily === true,
      cinematicDirection: approvals.cinematicDirection === true
    },
    rerolls: {
      rarityTiers: asRecord<number>(rerolls.rarityTiers),
      moodSet: Number(rerolls.moodSet ?? 0),
      legendaryScene: Number(rerolls.legendaryScene ?? 0)
    },
    lastAction: typeof lastAction.action === "string" && typeof lastAction.at === "string"
      ? {
          action: lastAction.action,
          target: typeof lastAction.target === "string" ? lastAction.target : undefined,
          note: typeof lastAction.note === "string" ? lastAction.note : undefined,
          walletAddress: typeof lastAction.walletAddress === "string" ? lastAction.walletAddress : undefined,
          at: lastAction.at
        }
      : undefined
  };
}

function studioAssetsFromBible(styleBible: StyleBiblePlan | undefined): StudioPreviewAsset[] {
  void styleBible;
  return [];
}

function studioAssetsFromPreviewAssets(assets: GeneratorRun["styleProfiles"][number]["previewAssets"]): StudioPreviewAsset[] {
  return assets
    .filter((asset) => studioDisplayAssetTypeSet.has(asset.type))
    .map((asset) => {
      const metadata = asRecord<unknown>(asset.metadata);
      const generationMetadata = asRecord<unknown>(asset.generationMetadata);
      return {
        type: asset.type as StudioPreviewAsset["type"],
        label: asset.label,
        uri: asset.uri,
        provider: asset.provider ?? stringFrom(metadata.provider) ?? stringFrom(generationMetadata.provider),
        model: stringFrom(metadata.model) ?? stringFrom(generationMetadata.model),
        generationType: stringFrom(metadata.generationType) ?? stringFrom(generationMetadata.generationType),
        promptHash: asset.promptHash ?? stringFrom(metadata.promptHash) ?? stringFrom(generationMetadata.promptHash),
        estimatedCostUsd: numberFrom(metadata.estimatedCostUsd ?? generationMetadata.estimatedCostUsd),
        cacheStatus: stringFrom(metadata.cacheStatus) ?? stringFrom(generationMetadata.cacheStatus),
        metadata,
        generationMetadata
      };
    });
}

function mapRunToPreview(run: GeneratorRun, preset: string): CollectionGeneratorPreview {
  const profile = run.styleProfiles[0];
  const categories = asRecord<string[]>(profile.traitPack?.categories);
  const previews = activePreviewAssets(profile.previewAssets);
  const samples = previews.filter((asset) => asset.type === "SAMPLE_NFT").slice(0, 6);
  const avatarUri = previews.find((asset) => asset.type === "AVATAR")?.uri ?? samples[0]?.uri;
  const quality = profile.qualityReports[0];
  const distinctiveness = profile.distinctivenessReports[0];
  const roles = asArray(profile.roleNames);
  const brandDna = asRecord<unknown>(profile.brandDna);
  const styleBible = brandDna.styleBible as StyleBiblePlan | undefined;
  const exportPlan = brandDna.exportPlan as StudioExportPlan | undefined;
  const persistedStudioAssets = studioAssetsFromPreviewAssets(previews).filter(isRealStudioBibleAsset);
  const studioAssets = persistedStudioAssets.length ? persistedStudioAssets : studioAssetsFromBible(styleBible);
  const styleBibleAsset = studioAssets.find((asset) => asset.type === "STYLE_BIBLE");
  const studioBibleReady = hasRealStudioBibleAssets({ studioAssets } as CollectionGeneratorPreview);
  const generationCost = costSummaryFromRun(run);
  const previewClassification = studioBibleReady ? "AI_CONCEPT_PREVIEW" : previewClassForStatus(profile.productionAssetStatus === "AI_CONCEPT" ? "WIREFRAME" : profile.productionAssetStatus, previews[0]?.previewClassification);

  return {
    id: run.id,
    collection: profile.collection,
    preset,
    theme: profile.theme,
    mascot: profile.mascot,
    artStyle: profile.artStyle,
    palette: asArray(profile.colors),
    backgroundWorld: profile.backgroundWorld,
    lore: profile.lore,
    raidTheme: profile.raidTheme,
    roleNames: roles,
    traitLanguage: asArray(profile.traitLanguage),
    traitCounts: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.length])),
    rarityWeights: asRecord<number>(profile.traitPack?.rarityWeights ?? profile.rarityStructure),
    unlocks: asRecord<string[]>(profile.traitPack?.unlockSchedule),
    assetProvider: run.studioProvider ?? "persisted-generator-run",
    conceptRequest: {
      provider: run.studioProvider ?? (studioAssets.some((asset) => asset.provider === "imagen") ? "imagen" : studioAssets.some((asset) => asset.provider === "gemini") ? "gemini" : studioAssets.some((asset) => /cached-imagen/i.test(asset.provider ?? "")) ? "cached-imagen" : studioAssets.some((asset) => /cached-gemini|cached/i.test(asset.provider ?? "")) ? "cached-gemini" : previews.some((asset) => asset.provider === "openai") ? "openai" : previews.some((asset) => asset.provider === "premium-fallback") ? "premium-fallback" : previews.some((asset) => asset.provider === "local-placeholder") ? "legacy-placeholder" : "persisted"),
      imageCount: studioAssets.length || previews.filter((asset) => asset.type === "BANNER" || asset.type === "SAMPLE_NFT").length,
      imagesThisRun: studioAssets.length,
      estimatedOpenAIRequestCount: 0,
      usesPaidOpenAIImageGeneration: false,
      cachedResultAvailable: studioAssets.some((asset) => asset.cacheStatus === "hit" || /cached/i.test(asset.provider ?? "")),
      estimatedCostUsd: generationCost.total,
      generationType: "fast_studio_preview",
      costBreakdown: generationCost.breakdown
    },
    previewClassification,
    productionAssetStatus: studioBibleReady ? profile.productionAssetStatus ?? "AI_CONCEPT" : profile.productionAssetStatus === "AI_CONCEPT" ? "WIREFRAME" : profile.productionAssetStatus ?? "WIREFRAME",
    finalProductionReady: isProductionStatus(profile.productionAssetStatus),
    studioWorkflow: studioWorkflowFromHints(run.communityHints),
    styleBible,
    studioAssets,
    styleBibleAsset,
    traitCatalogAsset: studioAssets.find((asset) => asset.type === "TRAIT_CATALOG"),
    rarityLadderAsset: studioAssets.find((asset) => asset.type === "RARITY_LADDER"),
    moodSheetAsset: studioAssets.find((asset) => asset.type === "MOOD_SHEET"),
    layerBreakdownAsset: studioAssets.find((asset) => asset.type === "LAYER_BREAKDOWN"),
    artTeam: styleBible?.artTeam,
    traitCoverageScore: styleBible?.qaReport.traitCoverageScore,
    rarityDiversityScore: styleBible?.qaReport.rarityDiversityScore,
    providerStatus: run.studioProvider ?? studioAssets[0]?.provider ?? previews[0]?.provider ?? "persisted-generator-run",
    exportPlan,
    curatedLayerPack: run.curatedLayerPacks?.[0],
    avatar: nonLegacyArt(avatarUri),
    banner: nonLegacyArt(previews.find((asset) => asset.type === "BANNER")?.uri),
    samples: normalizedSamples(profile.productionAssetStatus ?? "WIREFRAME", samples.map((asset, index) => {
      const metadata = asRecord<string>(asset.metadata);
      return {
        id: `${asset.version}-${index}`,
        name: asset.label,
        image: asset.uri,
        provider: asset.provider ?? undefined,
        rarity: metadata.rarity ?? "Rare",
        role: roles[index] ?? "Raider",
        traits: [
          metadata.mood ? `Mood: ${metadata.mood}` : null,
          metadata.expression ? `Expression: ${metadata.expression}` : null,
          metadata.base ? `Base: ${metadata.base}` : null,
          metadata.background ? `Background: ${metadata.background}` : null,
          metadata.headgear,
          metadata.aura,
          metadata.accessory
        ].filter((value) => typeof value === "string" && value.trim() && value !== "None").map(String).slice(0, 7)
      };
    })),
    quality: {
      previewQualityScore: quality.previewQualityScore,
      uniquenessScore: quality.uniquenessScore,
      colorHarmonyScore: quality.colorHarmonyScore,
      duplicateRiskScore: quality.duplicateRiskScore,
      compatibilityScore: quality.compatibilityScore,
      tier: previewTierLabel(quality.tier, isProductionStatus(profile.productionAssetStatus), run.studioProvider ?? "persisted-generator-run", previewClassification, studioBibleReady ? profile.productionAssetStatus ?? "AI_CONCEPT" : "WIREFRAME"),
      passed: quality.passed
    },
    distinctiveness: {
      silhouetteUniqueness: distinctiveness.silhouetteUniqueness,
      paletteUniqueness: distinctiveness.paletteUniqueness,
      mascotUniqueness: distinctiveness.mascotUniqueness,
      backgroundWorldUniqueness: distinctiveness.backgroundWorldUniqueness,
      traitLanguageUniqueness: distinctiveness.traitLanguageUniqueness,
      score: distinctiveness.score,
      passed: distinctiveness.passed
    }
  };
}

function mapPreviewOnly(data: PreviewOnlyResponse, preset: string): CollectionGeneratorPreview {
  const roles = asArray(data.brandDna.roleLanguage);
  const avatarUri = data.avatarPreviewSpec?.uri ?? data.samples[0]?.uri;
  const styleBible = data.styleBible ?? (data.brandDna.styleBible as StyleBiblePlan | undefined);
  const exportPlan = data.exportPlan ?? styleBible?.exportPlan;
  const studioAssets = (data.studioAssets?.length ? data.studioAssets : studioAssetsFromBible(styleBible)).filter(isRealStudioBibleAsset);
  const styleBibleAsset = isRealStudioBibleAsset(data.styleBibleAsset) ? data.styleBibleAsset : studioAssets.find((asset) => asset.type === "STYLE_BIBLE");
  const studioBibleReady = hasRealStudioBibleAssets({ studioAssets } as CollectionGeneratorPreview);
  const productionAssetStatus = studioBibleReady ? data.productionAssetStatus : data.productionAssetStatus === "AI_CONCEPT" ? "WIREFRAME" : data.productionAssetStatus;
  const previewClassification = studioBibleReady ? data.previewClassification ?? "AI_CONCEPT_PREVIEW" : "WIREFRAME_CONCEPT";
  return {
    id: "preview-only",
    collection: data.collection.name,
    preset,
    theme: data.collection.theme,
    mascot: data.collection.mascotArchetype,
    artStyle: data.collection.renderStyle,
    palette: data.collection.palette,
    backgroundWorld: data.collection.world,
    lore: data.collection.description,
    raidTheme: String(data.animationMoments[0]?.moment ?? "Founder Raid"),
    roleNames: roles,
    traitLanguage: data.traitTable.flatMap((row) => row.examples).slice(0, 24),
    traitCounts: Object.fromEntries(data.traitTable.map((row) => [row.category, row.count])),
    rarityWeights: data.rarityTable,
    unlocks: {},
    assetProvider: data.assetProvider,
    conceptRequest: data.conceptRequest,
    previewClassification,
    productionAssetStatus,
    finalProductionReady: isProductionStatus(data.productionAssetStatus),
    styleBible,
    studioAssets,
    styleBibleAsset,
    traitCatalogAsset: isRealStudioBibleAsset(data.traitCatalogAsset) ? data.traitCatalogAsset : studioAssets.find((asset) => asset.type === "TRAIT_CATALOG"),
    rarityLadderAsset: isRealStudioBibleAsset(data.rarityLadderAsset) ? data.rarityLadderAsset : studioAssets.find((asset) => asset.type === "RARITY_LADDER"),
    moodSheetAsset: isRealStudioBibleAsset(data.moodSheetAsset) ? data.moodSheetAsset : studioAssets.find((asset) => asset.type === "MOOD_SHEET"),
    layerBreakdownAsset: isRealStudioBibleAsset(data.layerBreakdownAsset) ? data.layerBreakdownAsset : studioAssets.find((asset) => asset.type === "LAYER_BREAKDOWN"),
    artTeam: data.artTeam ?? styleBible?.artTeam,
    traitCoverageScore: data.traitCoverageScore ?? styleBible?.qaReport.traitCoverageScore,
    rarityDiversityScore: data.rarityDiversityScore ?? styleBible?.qaReport.rarityDiversityScore,
    providerStatus: data.providerStatus ?? data.conceptRequest?.providerFailureReason ?? data.conceptRequest?.provider,
    exportPlan,
    curatedLayerPack: undefined,
    warnings: data.warnings,
    avatar: nonLegacyArt(avatarUri),
    banner: nonLegacyArt(data.bannerPreviewSpec?.uri),
    samples: normalizedSamples(productionAssetStatus, data.samples.slice(0, 6).map((sample, index) => ({
      id: `preview-${index}`,
      name: sample.label,
      image: sample.uri,
      provider: sample.provider,
      rarity: String(sample.metadata.rarity ?? "Rare"),
      role: roles[index] ?? "Founder",
      traits: [
        sample.metadata.mood ? `Mood: ${sample.metadata.mood}` : null,
        sample.metadata.expression ? `Expression: ${sample.metadata.expression}` : null,
        sample.metadata.base ? `Base: ${sample.metadata.base}` : null,
        sample.metadata.background ? `Background: ${sample.metadata.background}` : null,
        sample.metadata.headgear,
        sample.metadata.aura,
        sample.metadata.accessory
      ].filter((value) => typeof value === "string" && value.trim() && value !== "None").map(String).slice(0, 7)
    }))),
    quality: {
      previewQualityScore: data.quality.previewQualityScore,
      uniquenessScore: data.quality.uniquenessScore,
      colorHarmonyScore: data.quality.colorHarmonyScore,
      duplicateRiskScore: data.quality.duplicateRiskScore,
      compatibilityScore: data.quality.compatibilityScore,
      tier: previewTierLabel(data.quality.tier, isProductionStatus(productionAssetStatus), data.assetProvider, previewClassification, productionAssetStatus),
      passed: false
    },
    distinctiveness: {
      silhouetteUniqueness: data.distinctiveness.silhouetteUniqueness,
      paletteUniqueness: data.distinctiveness.paletteUniqueness,
      mascotUniqueness: data.distinctiveness.mascotUniqueness,
      backgroundWorldUniqueness: data.distinctiveness.backgroundWorldUniqueness,
      traitLanguageUniqueness: data.distinctiveness.traitLanguageUniqueness,
      score: data.distinctiveness.score,
      passed: data.distinctiveness.passed
    },
    tenKReadiness: data.tenKReadiness
  };
}

function normalizedSamples(status: ProductionAssetStatus, samples: CollectionGeneratorPreview["samples"]) {
  const visualsAllowed = status === "AI_CONCEPT" || isProductionStatus(status);
  return samples.slice(0, 6)
    .map((sample) => ({
      ...sample,
      image: visualsAllowed ? safeImage(sample.image, "") : sample.image
    }))
    .filter((sample) => !visualsAllowed || (Boolean(sample.image) && !isLegacyPlaceholderVisual(sample.image, sample.provider) && !(status === "AI_CONCEPT" && /wireframe/i.test(sample.provider ?? ""))));
}

function nonLegacyArt(src: string | undefined | null, provider?: string) {
  if (!src || isLegacyPlaceholderVisual(src, provider)) return "";
  return src;
}

function safeImage(src: string | undefined | null, fallback: string) {
  if (!src) return fallback;
  if (isLegacyPlaceholderVisual(src)) return fallback;
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

function previewStatusLabel(preview: CollectionGeneratorPreview) {
  return studioPreviewStatusLabel(preview);
}

function previewTierLabel(tier: "BASIC" | "PREMIUM" | "LEGENDARY_READY", finalProductionReady: boolean, assetProvider?: string, previewClassification?: string, productionAssetStatus?: ProductionAssetStatus): CollectionGeneratorPreview["quality"]["tier"] {
  if (!finalProductionReady && (productionAssetStatus === "WIREFRAME" || previewClassification === "WIREFRAME_CONCEPT")) return "Preview required";
  if (productionAssetStatus === "AI_CONCEPT" || previewClassification === "AI_CONCEPT_PREVIEW") return "AI studio";
  if (!finalProductionReady && /wireframe|persisted-generator-run/i.test(assetProvider ?? "")) return "Preview required";
  return tier === "LEGENDARY_READY" ? "Legendary-ready" : tier === "PREMIUM" ? "Premium" : "Basic";
}

function previewClassForStatus(status: ProductionAssetStatus | undefined, fallback?: string | null): CollectionGeneratorPreview["previewClassification"] {
  if (fallback === "WIREFRAME_CONCEPT" || fallback === "AI_CONCEPT_PREVIEW" || fallback === "PRODUCTION_ASSET_PREVIEW") return fallback;
  if (status === "AI_CONCEPT") return "AI_CONCEPT_PREVIEW";
  if (isProductionStatus(status)) return "PRODUCTION_ASSET_PREVIEW";
  return "WIREFRAME_CONCEPT";
}

function isProductionStatus(status: ProductionAssetStatus | undefined) {
  return status === "CURATED_LAYER_READY" || status === "ARTIST_APPROVED" || status === "FINAL_PRODUCTION";
}

function isWireframePreview(preview: Pick<CollectionGeneratorPreview, "productionAssetStatus" | "previewClassification">) {
  return isStudioPreviewRequired(preview);
}

function assetStatusLabel(status: ProductionAssetStatus | undefined) {
  if (status === "FINAL_PRODUCTION") return "Final";
  if (status === "ARTIST_APPROVED") return "Artist approved";
  if (status === "CURATED_LAYER_READY") return "Curated layers";
  if (status === "AI_CONCEPT") return "Art direction";
  return "Pending art";
}

function sourceMetadataFromScan(scan: TokenScan) {
  return {
    mint: scan.mint,
    name: scan.name,
    symbol: scan.symbol,
    description: scan.description,
    metadataUri: scan.metadataUri,
    imageUri: scan.imageUri,
    logoUri: scan.logoUri,
    externalUrl: scan.externalUrl,
    socialLinks: scan.socialLinks,
    extensions: scan.extensions,
    decimals: scan.decimals,
    supply: scan.supply,
    riskNotes: scan.riskNotes
  };
}

function overridePayload(scan: TokenScan | null, tokenName: string, tokenSymbol: string, description: string, logoUri: string) {
  if (!scan) return undefined;
  return {
    tokenName: tokenName.trim() || undefined,
    tokenSymbol: tokenSymbol.trim() || undefined,
    description: description.trim() || undefined,
    logoUri: logoUri.trim() || undefined
  };
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function selectedPresetName(presets: Preset[], id: string) {
  return presets.find((preset) => preset.id === id)?.name ?? id;
}

function short(value: string) {
  return value.length > 12 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asRecord<T>(value: unknown) {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, T>;
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function costSummaryFromRun(run: GeneratorRun) {
  const raw = Array.isArray(run.generationCostBreakdown) ? run.generationCostBreakdown : [];
  const breakdown = raw
    .map((item) => {
      const record = asRecord<unknown>(item);
      return {
        provider: stringFrom(record.provider),
        model: stringFrom(record.model),
        generationType: stringFrom(record.generationType),
        promptHash: stringFrom(record.promptHash),
        estimatedCostUsd: numberFrom(record.estimatedCostUsd),
        cacheStatus: stringFrom(record.cacheStatus)
      };
    })
    .filter((item) => item.generationType);
  const persistedTotal = numberFrom(run.estimatedCostUsd);
  return {
    total: persistedTotal ?? Number(breakdown.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0).toFixed(4)),
    breakdown
  };
}
