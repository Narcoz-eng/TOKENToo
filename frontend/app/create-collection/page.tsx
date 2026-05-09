"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, LockKeyhole, Palette, RadioTower, RefreshCcw, Search, ShieldCheck, Sparkles, Swords, Upload, Wand2, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionPreview } from "@/components/CollectionPreview";
import { SetupWarning } from "@/components/ApiState";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiFetch } from "@/lib/api";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import type { CollectionGeneratorPreview } from "@/lib/types";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type Preset = { id: string; name: string; artStyle: string; mood: string };
type ProductionAssetStatus = "WIREFRAME" | "AI_CONCEPT" | "CURATED_LAYER_READY" | "ARTIST_APPROVED" | "FINAL_PRODUCTION";
type SystemCapabilities = {
  databaseAvailable?: boolean;
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
  approvedLayerPackAvailable?: boolean;
  demoCuratedLayerPackEnabled?: boolean;
  demoCuratedLayerPackAllowed?: boolean;
  productionStorageAvailable?: boolean;
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
  warnings: string[];
};
type GeneratorRun = {
  id: string;
  status: string;
  tokenSymbol: string;
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
    productionAssetStatus?: ProductionAssetStatus;
    isApproved: boolean;
    traitPack?: {
      categories: unknown;
      rarityWeights: unknown;
      unlockSchedule: unknown;
    } | null;
    previewAssets: Array<{
      type: "AVATAR" | "BANNER" | "SAMPLE_NFT" | "TRAIT_SHEET" | "ANIMATION_KEYFRAME";
      label: string;
      uri: string;
      metadata: unknown;
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
  samples: Array<{ label: string; uri: string; metadata: Record<string, unknown> }>;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [launchResult, setLaunchResult] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [setupActionMessage, setSetupActionMessage] = useState<string | null>(null);
  const presetName = selectedPresetName(presets, selectedPreset);
  const preview = useMemo(() => (run ? mapRunToPreview(run, presetName) : previewOnly ? mapPreviewOnly(previewOnly, presetName) : null), [run, previewOnly, presetName]);
  const latestProfile = run?.styleProfiles[0];
  const latestQuality = latestProfile?.qualityReports[0];
  const latestDistinctiveness = latestProfile?.distinctivenessReports[0];
  const canApprove = Boolean(run && approvalConfirmed && latestQuality?.passed && latestQuality.tier !== "BASIC" && latestDistinctiveness?.passed && capabilityState.data?.capabilities?.databaseAvailable);
  const effectiveTokenName = tokenName.trim() || scan?.name || "";
  const effectiveTokenSymbol = tokenSymbol.trim() || scan?.symbol || "";
  const effectiveDescription = description.trim() || scan?.description || (effectiveTokenName ? `${effectiveTokenName} holder community built from verified Solana token metadata.` : "");
  const effectiveLogoUri = logoUri.trim() || scan?.imageUri || scan?.logoUri || "";
  const studioPreview = preview ?? fallbackPreview(effectiveTokenName, effectiveTokenSymbol, effectiveDescription, presetName);
  const activeStep = launchResult ? 4 : run?.status === "APPROVED" ? 3 : preview ? 2 : scan ? 1 : 0;
  const setup = capabilityState.data?.setupChecklist;
  const capabilities = capabilityState.data?.capabilities;
  const canGenerateAiConcept = Boolean(scan && setup?.creativePreviewReady);
  const launchEnvironmentReady = Boolean(setup?.devnetLaunchReady || setup?.productionLaunchReady);

  useEffect(() => {
    apiFetch<Preset[]>("/generator/presets")
      .then((data) => {
        setPresets(data);
        if (data[0] && !data.some((preset) => preset.id === selectedPreset)) setSelectedPreset(data[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, [selectedPreset]);

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
            slogans: ["join the faction"],
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
        body: JSON.stringify(previewPayload())
      });
      setPreviewOnly(data);
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
        slogans: ["join the faction"],
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
        <div className="opacity-80">
          <SetupWarning warnings={previewOnly?.warnings?.slice(0, 1)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <SectionCard title="Launch Brief" className="p-5">
              <div className="space-y-4">
                <Field label="Token CA / mint address" value={tokenMint} onChange={(value) => { setTokenMint(value); setScan(null); }} placeholder="Solana token mint address" />
                <button type="button" onClick={scanToken} disabled={loading || tokenMint.trim().length < 32} className="phew-button phew-button-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-60">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Scan Token
                </button>
                {scan ? <ResolvedTokenCard scan={scan} /> : null}
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
                <MiniControl icon={LockKeyhole} label="Vault NFTs" value="10k-ready" />
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
              <button type="button" onClick={generatePreview} disabled={loading || !canGenerateAiConcept} className="phew-button phew-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate AI Concept Preview
              </button>
              <button type="button" onClick={createRun} disabled={loading || !scan || !walletAuth.connected || !capabilityState.data?.capabilities?.databaseAvailable} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-cyan/50 bg-vault-cyan/10 px-5 text-sm font-bold text-vault-cyan disabled:opacity-45">
                <ShieldCheck className="size-4" /> Save Launch Draft
              </button>
            </div>
          </aside>

          <main className="space-y-6">
            <LiveLaunchPreview preview={studioPreview} launchResult={launchResult} />

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

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <SectionCard title="Launch Readiness" className="p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <ReadinessItem label="Brand direction" complete={Boolean(tokenName || preview)} />
                  <ReadinessItem label="Vault NFT preview" complete={Boolean(preview)} />
                  <ReadinessItem label="Quality reviewed" complete={Boolean(latestQuality?.passed && latestQuality.tier !== "BASIC")} />
                  <ReadinessItem label="Founder approval" complete={approvalConfirmed} />
                </div>
                <label className="mt-4 flex items-start gap-3 rounded-md border border-vault-green/30 bg-vault-green/8 p-4 text-sm text-slate-200">
                  <input className="mt-1 accent-[#baff00]" type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} />
                  <span>I understand concept previews are not mintable final art; approve only production-ready curated or artist assets for launch.</span>
                </label>
              </SectionCard>

              <SectionCard title="Launch Actions" className="p-5">
                <div className="space-y-3">
                  <button type="button" onClick={() => mutateRun("regenerate-style")} disabled={!run || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-cyan/40 bg-vault-cyan/8 text-sm font-bold text-vault-cyan disabled:opacity-45">
                    <RefreshCcw className="size-4" /> Refine Style
                  </button>
                  <button type="button" onClick={() => mutateRun("regenerate-previews")} disabled={!run || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-line bg-black/30 text-sm font-bold disabled:opacity-45">
                    <Wand2 className="size-4 text-vault-green" /> Refresh Vault Set
                  </button>
                  <button type="button" onClick={approveRun} disabled={!canApprove || loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-green/50 bg-vault-green/10 text-sm font-bold text-vault-green disabled:opacity-45">
                    <ShieldCheck className="size-4" /> Approve Production Assets
                  </button>
                  <button type="button" onClick={launchCollection} disabled={!run || run.status !== "APPROVED" || loading || !launchEnvironmentReady} className="phew-button phew-button-primary flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-black text-black disabled:opacity-45">
                    <Check className="size-4" /> Launch Collection
                  </button>
                </div>
              </SectionCard>
            </div>

            <CollectionPreview preview={studioPreview} compact={!preview} />
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
    <SectionCard title="Setup Checklist" className="p-5">
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
        <ActionButton icon={Sparkles} label="Generate AI Concept Preview" disabled={loading || !canGenerateAiConcept} onClick={onGenerateAiConcept} primary />
        <ActionButton icon={Wand2} label="Use Demo Curated Layer Pack for Devnet" disabled={loading} onClick={onUseDemoPack} />
        <ActionButton icon={Upload} label="Upload/Attach Curated Layer Pack" disabled={loading} onClick={onAttachLayerPack} />
        <ActionButton icon={RadioTower} label="Validate Program ID" disabled={loading} onClick={onValidateProgram} />
        <ActionButton icon={ShieldCheck} label="Validate Storage" disabled={loading} onClick={onValidateStorage} />
      </div>
    </SectionCard>
  );
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
    "OPENAI_API_KEY",
    "ENABLE_AI_IMAGE_GENERATION",
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

function LiveLaunchPreview({ preview, launchResult }: { preview: CollectionGeneratorPreview; launchResult: string | null }) {
  const wireframeOnly = isWireframePreview(preview);
  return (
    <section className="phew-panel relative overflow-hidden rounded-lg">
      <img src={wireframeOnly ? brandAssets.emptyVaultPremium : safeImage(preview.banner, brandAssets.launchHero)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/88 to-[#020806]/30" />
      <div className="absolute inset-0 grid-mask opacity-25" />
      <div className="relative grid gap-6 p-6 lg:grid-cols-[150px_minmax(0,1fr)_260px] lg:p-7">
        {wireframeOnly ? (
          <div className="grid aspect-square place-items-center rounded-lg border border-vault-cyan/35 bg-black/55 shadow-[0_0_40px_rgba(22,215,210,0.18)]">
            <div className="text-center">
              <Wand2 className="mx-auto size-7 text-vault-cyan" />
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Art Direction</p>
            </div>
          </div>
        ) : (
          <img src={safeImage(preview.avatar, brandAssets.factionMark)} alt="" className="aspect-square rounded-lg border border-vault-green/40 object-cover shadow-green" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill accent="green">{preview.preset || "PHEW Launch Studio"}</StatusPill>
            <StatusPill accent={preview.productionAssetStatus === "FINAL_PRODUCTION" || preview.productionAssetStatus === "ARTIST_APPROVED" || preview.productionAssetStatus === "CURATED_LAYER_READY" ? "green" : "gold"}>{previewStatusLabel(preview)}</StatusPill>
            {launchResult ? <StatusPill accent="cyan">Launched</StatusPill> : null}
          </div>
          <h2 className="mt-4 text-4xl font-black leading-tight">{preview.collection}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{preview.lore}</p>
          {wireframeOnly ? <p className="mt-3 max-w-2xl text-xs font-bold text-vault-gold">Professional concept imagery is not available yet. Creative DNA is ready; wireframes stay in debug review.</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {["Vault NFTs", "Raid Rooms", "Staking Hooks", "Faction Identity"].map((tag) => (
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

function ResolvedTokenCard({ scan }: { scan: TokenScan }) {
  return (
    <div className="rounded-md border border-vault-green/35 bg-vault-green/8 p-4">
      <div className="flex gap-3">
        <img src={safeImage(scan.imageUri || scan.logoUri, brandAssets.factionMark)} alt="" className="size-16 rounded-md border border-white/10 object-cover" />
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
      {scan.riskNotes.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {scan.riskNotes.slice(0, 5).map((note) => (
            <span key={note} className="rounded-md border border-vault-gold/25 bg-vault-gold/8 px-2 py-1 text-[11px] font-bold text-vault-gold">{note}</span>
          ))}
        </div>
      ) : null}
      {scan.persistenceWarning ? <p className="mt-3 text-xs text-vault-gold">{scan.persistenceWarning}</p> : null}
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

function fallbackPreview(tokenName: string, tokenSymbol: string, description: string, preset: string): CollectionGeneratorPreview {
  return {
    id: "studio-preview",
    collection: tokenName.trim() || "PHEW Vault Faction",
    preset: preset || "PHEW Vault Faction",
    theme: "Token-backed vault faction",
    mascot: tokenSymbol.trim() || "PHEW",
    artStyle: "Dark premium sci-fi vault",
    palette: ["#baff00", "#16d7d2", "#071017", "#f4c542"],
    backgroundWorld: "Cinematic vault command chamber",
    lore: description.trim() || "A premium faction identity will form here as you define the token, brand kit, vault collection, and launch readiness.",
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
    avatar: brandAssets.factionMark,
    banner: brandAssets.launchHero,
    samples: brandAssets.nftVaults.map((image, index) => ({
      id: `curated-${index}`,
      name: [`Vault Relic #001`, `Vault Key #014`, `Founder Crown #077`][index],
      image,
      rarity: ["Rare", "Epic", "Legendary"][index],
      role: ["Vault Raider", "Key Bearer", "Founder Guard"][index],
      traits: [["Lime core", "Obsidian frame"], ["Cyan charge", "Key relic"], ["Gold seal", "Legendary crown"]][index]
    })),
    quality: {
      previewQualityScore: 84,
      uniquenessScore: 82,
      colorHarmonyScore: 92,
      duplicateRiskScore: 18,
      compatibilityScore: 88,
      tier: "Wireframe concept",
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
}

function mapRunToPreview(run: GeneratorRun, preset: string): CollectionGeneratorPreview {
  const profile = run.styleProfiles[0];
  const categories = asRecord<string[]>(profile.traitPack?.categories);
  const previews = profile.previewAssets;
  const samples = previews.filter((asset) => asset.type === "SAMPLE_NFT").slice(-6);
  const quality = profile.qualityReports[0];
  const distinctiveness = profile.distinctivenessReports[0];
  const roles = asArray(profile.roleNames);

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
    assetProvider: "persisted-generator-run",
    previewClassification: previewClassForStatus(profile.productionAssetStatus ?? "WIREFRAME", previews[0]?.previewClassification),
    productionAssetStatus: profile.productionAssetStatus ?? "WIREFRAME",
    finalProductionReady: isProductionStatus(profile.productionAssetStatus),
    avatar: safeImage(previews.find((asset) => asset.type === "AVATAR")?.uri, brandAssets.factionMark),
    banner: safeImage(previews.find((asset) => asset.type === "BANNER")?.uri, brandAssets.launchHero),
    samples: normalizedSamples(samples.map((asset, index) => {
      const metadata = asRecord<string>(asset.metadata);
      return {
        id: `${asset.version}-${index}`,
        name: asset.label,
        image: asset.uri,
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
      tier: previewTierLabel(quality.tier, isProductionStatus(profile.productionAssetStatus), "persisted-generator-run", previewClassForStatus(profile.productionAssetStatus, previews[0]?.previewClassification), profile.productionAssetStatus ?? "WIREFRAME"),
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
    previewClassification: data.previewClassification ?? previewClassForStatus(data.productionAssetStatus, undefined),
    productionAssetStatus: data.productionAssetStatus,
    finalProductionReady: isProductionStatus(data.productionAssetStatus),
    warnings: data.warnings,
    avatar: safeImage(data.avatarPreviewSpec?.uri, brandAssets.factionMark),
    banner: safeImage(data.bannerPreviewSpec?.uri, brandAssets.launchHero),
    samples: normalizedSamples(data.samples.slice(0, 6).map((sample, index) => ({
      id: `preview-${index}`,
      name: sample.label,
      image: sample.uri,
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
      tier: previewTierLabel(data.quality.tier, isProductionStatus(data.productionAssetStatus), data.assetProvider, data.previewClassification, data.productionAssetStatus),
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

function normalizedSamples(samples: CollectionGeneratorPreview["samples"]) {
  const curated = fallbackPreview("", "", "", "").samples;
  const merged = samples.length ? samples : curated;
  return merged.slice(0, 6).map((sample, index) => ({
    ...sample,
    image: safeImage(sample.image, brandAssets.nftVaults[index % brandAssets.nftVaults.length])
  }));
}

function safeImage(src: string | undefined | null, fallback: string) {
  if (!src) return fallback;
  const value = src.toLowerCase();
  if (value.includes("placeholder") || value.includes("smiley") || value.includes("pink")) return fallback;
  return src;
}

function previewStatusLabel(preview: CollectionGeneratorPreview) {
  if (preview.productionAssetStatus === "WIREFRAME" || preview.previewClassification === "WIREFRAME_CONCEPT") return "Professional preview pending";
  if (preview.productionAssetStatus === "AI_CONCEPT" || preview.previewClassification === "AI_CONCEPT_PREVIEW") return "AI concept preview";
  if (preview.productionAssetStatus === "FINAL_PRODUCTION") return "Final production assets";
  if (preview.productionAssetStatus === "ARTIST_APPROVED") return "Artist approved assets";
  if (preview.productionAssetStatus === "CURATED_LAYER_READY") return "Curated layer ready";
  return "Concept preview";
}

function previewTierLabel(tier: "BASIC" | "PREMIUM" | "LEGENDARY_READY", finalProductionReady: boolean, assetProvider?: string, previewClassification?: string, productionAssetStatus?: ProductionAssetStatus): CollectionGeneratorPreview["quality"]["tier"] {
  if (productionAssetStatus === "WIREFRAME" || (!finalProductionReady && (previewClassification === "WIREFRAME_CONCEPT" || /wireframe|fallback|preview|persisted-generator-run/i.test(assetProvider ?? "")))) return "Wireframe concept";
  if (productionAssetStatus === "AI_CONCEPT" || previewClassification === "AI_CONCEPT_PREVIEW") return "AI concept";
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
  return preview.productionAssetStatus === "WIREFRAME" || preview.previewClassification === "WIREFRAME_CONCEPT";
}

function assetStatusLabel(status: ProductionAssetStatus | undefined) {
  if (status === "FINAL_PRODUCTION") return "Final";
  if (status === "ARTIST_APPROVED") return "Artist approved";
  if (status === "CURATED_LAYER_READY") return "Curated layers";
  if (status === "AI_CONCEPT") return "AI concept";
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
