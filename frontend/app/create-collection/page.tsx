"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Palette, RefreshCcw, ShieldCheck, Sparkles, Upload, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionPreview } from "@/components/CollectionPreview";
import { FounderStatusPanel, SetupWarning, WalletDisconnectedState } from "@/components/ApiState";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiFetch } from "@/lib/api";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import type { CollectionGeneratorPreview } from "@/lib/types";
import { brandAssets } from "@/lib/brand-assets";

type Preset = { id: string; name: string; artStyle: string; mood: string };
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
    isApproved: boolean;
    traitPack?: {
      categories: unknown;
      rarityWeights: unknown;
      unlockSchedule: unknown;
    } | null;
    previewAssets: Array<{
      type: "AVATAR" | "BANNER" | "SAMPLE_NFT";
      label: string;
      uri: string;
      metadata: unknown;
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

export default function CreateCollectionPage() {
  const walletAuth = useWalletAuth();
  const capabilityState = useApiResource<{ mode: string; capabilities: Record<string, boolean>; warnings: string[] }>("/system/capabilities");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenMint, setTokenMint] = useState("");
  const [logoUri, setLogoUri] = useState("");
  const [description, setDescription] = useState("");
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
  const preview = useMemo(() => (run ? mapRunToPreview(run, selectedPresetName(presets, selectedPreset)) : previewOnly ? mapPreviewOnly(previewOnly, selectedPresetName(presets, selectedPreset)) : null), [run, previewOnly, presets, selectedPreset]);
  const latestProfile = run?.styleProfiles[0];
  const latestQuality = latestProfile?.qualityReports[0];
  const latestDistinctiveness = latestProfile?.distinctivenessReports[0];
  const canApprove = Boolean(run && approvalConfirmed && latestQuality?.passed && latestQuality.tier !== "BASIC" && latestDistinctiveness?.passed && capabilityState.data?.capabilities?.databaseAvailable);

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
          tokenName,
          tokenSymbol,
          tokenMint,
          logoUri,
          description,
          selectedPreset,
          hints: {
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

  async function reloadRun() {
    if (!run) return;
    await action(async () => setRun(await walletAuth.authFetch<GeneratorRun>(`/generator/runs/${run.id}`)));
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
      tokenName,
      tokenSymbol,
      tokenMint,
      logoUri,
      description,
      selectedPreset,
      hints: {
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
      <div className="space-y-5">
        <FounderStatusPanel status={capabilityState.data} />
        {!walletAuth.connected ? <WalletDisconnectedState /> : null}
        <SetupWarning warnings={previewOnly?.warnings} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="phew-panel phew-scanline relative overflow-hidden rounded-lg p-6">
            <img src={brandAssets.vaultHero} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-30 mix-blend-screen" />
            <div className="relative">
              <p className="text-sm font-black uppercase text-vault-green">Create Community</p>
              <h1 className="mt-2 max-w-4xl text-4xl font-black">Forge a faction identity for token-backed vault NFTs.</h1>
              <p className="mt-3 max-w-3xl text-slate-300">Set the token, define the brand DNA, generate a vault-ready collection system, then review the launch preview before approval.</p>
              <div className="mt-6 grid gap-2 md:grid-cols-4">
                {["Basics", "Branding", "Collection", "Review"].map((step, index) => (
                  <div key={step} className={`rounded-md border p-3 text-sm font-black ${index === 0 ? "border-vault-green bg-vault-green/15 text-vault-green" : "border-vault-line bg-black/30 text-slate-400"}`}>
                    <span className="mr-2 text-xs">0{index + 1}</span>{step}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <SectionCard title="Persistence Status">
            <div className="space-y-3">
              <StatusPill accent={run?.status === "APPROVED" ? "green" : run ? "purple" : "gold"}>{run?.status ?? "No Run Yet"}</StatusPill>
              <p className="text-sm text-slate-400">{run ? `Run ID: ${run.id}` : previewOnly ? `${previewOnly.assetProvider}; production launch blocked until setup is complete.` : "Enter real token metadata to create a preview."}</p>
              {run ? <button onClick={reloadRun} className="h-10 w-full rounded-lg border border-vault-line bg-black/25 text-sm font-bold">Reload Persisted Run</button> : null}
            </div>
          </SectionCard>
        </div>

        {error ? <div className="rounded-lg border border-vault-red/40 bg-vault-red/10 p-4 text-sm text-vault-red">{error}</div> : null}
        {walletAuth.error ? <div className="rounded-lg border border-vault-red/40 bg-vault-red/10 p-4 text-sm text-vault-red">{walletAuth.error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <SectionCard title="Create Community Flow">
              <div className="space-y-2 text-sm">
                {[
                  ["1", "Input token"],
                  ["2", "Add memes and context"],
                  ["3", "Generate identity"],
                  ["4", "Review Premium+ quality"],
                  ["5", "Approve immutable style"],
                  ["6", "Launch collection"]
                ].map(([step, label], index) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg border border-vault-line bg-black/25 p-3">
                    <span className="flex size-7 items-center justify-center rounded-md bg-vault-purple/20 text-xs font-black text-vault-purple">{step}</span>
                    <span className={run && (index < 3 || run.status === "APPROVED") ? "font-semibold text-white" : "text-slate-400"}>{label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Token Inputs">
              <div className="space-y-3">
                <Field label="Token name" value={tokenName} onChange={setTokenName} />
                <Field label="Token symbol" value={tokenSymbol} onChange={setTokenSymbol} />
                <Field label="Mint address" value={tokenMint} onChange={setTokenMint} />
                <Field label="Logo URL" value={logoUri} onChange={setLogoUri} icon={Upload} />
                <label className="block">
                  <span className="text-sm text-slate-400">Short description / vibe</span>
                  <textarea className="phew-input mt-2 min-h-24 w-full rounded-md px-4 py-3 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Community Context">
              <div className="space-y-3">
                <div className="rounded-lg border border-vault-line bg-black/25 p-3 text-sm">
                  <span className="text-slate-400">Authenticated creator wallet</span>
                  <p className="mt-1 font-bold">{walletAuth.address ?? "Connect wallet to create"}</p>
                </div>
                <Field label="Memes / inside jokes" value={memes} onChange={setMemes} />
                <Field label="Telegram / X phrases" value={phrases} onChange={setPhrases} />
                <Field label="Mascot preference" value={mascotPreference} onChange={setMascotPreference} />
                <Field label="Mood" value={mood} onChange={setMood} />
              </div>
            </SectionCard>

            <SectionCard title="Lifecycle">
              <div className="space-y-2 text-sm">
                {["POST /generator/runs", "GET /generator/runs/:id", "POST regenerate-style", "POST regenerate-previews", "POST approve"].map((label, index) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg bg-black/25 p-3">
                    <Check className={`size-4 ${run && (index === 0 || run.status === "APPROVED") ? "text-vault-green" : "text-slate-500"}`} />
                  <span>{label}</span>
                </div>
                ))}
              </div>
            </SectionCard>
          </aside>

          <main className="space-y-5">
            <SectionCard title="Premium Art Presets">
              <div className="grid gap-3 md:grid-cols-4">
                {presets.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`rounded-lg border p-4 text-left transition hover:border-vault-purple ${selectedPreset === preset.id ? "border-vault-purple bg-vault-purple/20" : "border-vault-line bg-black/25"}`}
                  >
                    <Palette className="mb-3 size-6 text-vault-purple" />
                    <p className="font-bold">{preset.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{preset.artStyle}</p>
                  </button>
                ))}
              </div>
            </SectionCard>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={generatePreview} disabled={loading} className="phew-button phew-button-primary inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate Preview
              </button>
              <button type="button" onClick={createRun} disabled={loading || !walletAuth.connected || !capabilityState.data?.capabilities?.databaseAvailable} className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-cyan/50 bg-vault-cyan/10 px-5 text-sm font-bold text-vault-cyan disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Save Run
              </button>
              <button type="button" onClick={() => mutateRun("regenerate-style")} disabled={!run || loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-purple/50 bg-vault-purple/10 px-4 text-sm font-bold text-vault-purple disabled:opacity-50">
                <RefreshCcw className="size-4" /> Regenerate Style
              </button>
              <button type="button" onClick={() => mutateRun("regenerate-previews")} disabled={!run || loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-4 text-sm font-bold disabled:opacity-50">
                <Wand2 className="size-4 text-vault-green" /> Regenerate Previews
              </button>
              <button type="button" onClick={approveRun} disabled={!canApprove || loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-green/50 bg-vault-green/10 px-4 text-sm font-bold text-vault-green disabled:opacity-50">
                <ShieldCheck className="size-4" /> Approve Version
              </button>
              <button type="button" onClick={launchCollection} disabled={!run || run.status !== "APPROVED" || loading || !capabilityState.data?.capabilities?.productionStorageAvailable} className="phew-button phew-button-primary inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-black text-black disabled:opacity-50">
                <Check className="size-4" /> Launch Collection
              </button>
            </div>

            <SectionCard title="Approval Gate">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-lg border border-vault-line bg-black/25 p-4 text-sm text-slate-300">
                  Approval locks the style profile, trait pack version, lore, role language, rarity table, unlock schedule, and metadata schema. Future upgrades can add unlock packs, but they cannot mutate this approved identity.
                </div>
                <label className="flex items-start gap-3 rounded-lg border border-vault-purple/40 bg-vault-purple/10 p-4 text-sm">
                  <input className="mt-1" type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} />
                  <span>I confirm this Premium+ identity is final and ready to become the immutable collection profile.</span>
                </label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Gate label="Quality" value={latestQuality ? `${latestQuality.tier} / ${latestQuality.previewQualityScore}` : "Not generated"} passed={Boolean(latestQuality?.passed && latestQuality.tier !== "BASIC")} />
                <Gate label="Distinctiveness" value={latestDistinctiveness ? `${latestDistinctiveness.score}` : "Not generated"} passed={Boolean(latestDistinctiveness?.passed)} />
                <Gate label="Launch route" value={launchResult ?? "Pending"} passed={Boolean(launchResult)} />
              </div>
            </SectionCard>

            {preview ? (
              <CollectionPreview preview={preview} />
            ) : (
              <SectionCard title="No Preview Yet">
              <div className="rounded-lg border border-dashed border-vault-purple/40 bg-vault-purple/10 p-8 text-center text-slate-300">
                  Enter token metadata and generate a preview to see Brand DNA, premium fallback assets, trait depth, rarity, animation moments, and 10k readiness blockers.
                </div>
              </SectionCard>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, icon: Icon }: { label: string; value: string; onChange: (value: string) => void; icon?: typeof Upload }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="relative mt-2">
        {Icon ? <Icon className="absolute left-3 top-3 size-4 text-vault-purple" /> : null}
        <input className={`phew-input h-11 w-full rounded-md px-4 text-sm ${Icon ? "pl-10" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function Gate({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-400">{label}</span>
        <StatusPill accent={passed ? "green" : "gold"}>{passed ? "Pass" : "Blocked"}</StatusPill>
      </div>
      <p className="mt-2 font-bold">{value}</p>
    </div>
  );
}

function mapRunToPreview(run: GeneratorRun, preset: string): CollectionGeneratorPreview {
  const profile = run.styleProfiles[0];
  const categories = asRecord<string[]>(profile.traitPack?.categories);
  const previews = profile.previewAssets;
  const samples = previews.filter((asset) => asset.type === "SAMPLE_NFT").slice(-5);
  const quality = profile.qualityReports[0];
  const distinctiveness = profile.distinctivenessReports[0];

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
    roleNames: asArray(profile.roleNames),
    traitLanguage: asArray(profile.traitLanguage),
    traitCounts: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.length])),
    rarityWeights: asRecord<number>(profile.traitPack?.rarityWeights ?? profile.rarityStructure),
    unlocks: asRecord<string[]>(profile.traitPack?.unlockSchedule),
    assetProvider: "persisted-generator-run",
    finalProductionReady: quality?.passed && quality.tier !== "BASIC",
    avatar: previews.find((asset) => asset.type === "AVATAR")?.uri ?? "",
    banner: previews.find((asset) => asset.type === "BANNER")?.uri ?? "",
    samples: samples.map((asset, index) => {
      const metadata = asRecord<string>(asset.metadata);
      return {
        id: `${asset.version}-${index}`,
        name: asset.label,
        image: asset.uri,
        rarity: metadata.rarity ?? "Rare",
        role: asArray(profile.roleNames)[index] ?? "Raider",
        traits: [metadata.headgear, metadata.aura, metadata.accessory].filter(Boolean)
      };
    }),
    quality: {
      previewQualityScore: quality.previewQualityScore,
      uniquenessScore: quality.uniquenessScore,
      colorHarmonyScore: quality.colorHarmonyScore,
      duplicateRiskScore: quality.duplicateRiskScore,
      compatibilityScore: quality.compatibilityScore,
      tier: quality.tier === "LEGENDARY_READY" ? "Legendary-ready" : quality.tier === "PREMIUM" ? "Premium" : "Basic",
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

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function mapPreviewOnly(data: PreviewOnlyResponse, preset: string): CollectionGeneratorPreview {
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
    roleNames: asArray(data.brandDna.roleLanguage),
    traitLanguage: data.traitTable.flatMap((row) => row.examples).slice(0, 24),
    traitCounts: Object.fromEntries(data.traitTable.map((row) => [row.category, row.count])),
    rarityWeights: data.rarityTable,
    unlocks: {},
    assetProvider: data.assetProvider,
    finalProductionReady: data.finalProductionReady,
    warnings: data.warnings,
    avatar: data.avatarPreviewSpec?.uri ?? "",
    banner: data.bannerPreviewSpec?.uri ?? "",
    samples: data.samples.slice(0, 5).map((sample, index) => ({
      id: `preview-${index}`,
      name: sample.label,
      image: sample.uri,
      rarity: String(sample.metadata.rarity ?? "Rare"),
      role: asArray(data.brandDna.roleLanguage)[index] ?? "Founder",
      traits: [sample.metadata.headgear, sample.metadata.aura, sample.metadata.accessory].filter(Boolean).map(String)
    })),
    quality: {
      previewQualityScore: data.quality.previewQualityScore,
      uniquenessScore: data.quality.uniquenessScore,
      colorHarmonyScore: data.quality.colorHarmonyScore,
      duplicateRiskScore: data.quality.duplicateRiskScore,
      compatibilityScore: data.quality.compatibilityScore,
      tier: data.quality.tier === "LEGENDARY_READY" ? "Legendary-ready" : data.quality.tier === "PREMIUM" ? "Premium" : "Basic",
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

function selectedPresetName(presets: Preset[], id: string) {
  return presets.find((preset) => preset.id === id)?.name ?? id;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asRecord<T>(value: unknown) {
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, T>;
}
