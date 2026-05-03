"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Palette, RefreshCcw, ShieldCheck, Sparkles, Upload, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionPreview } from "@/components/CollectionPreview";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import type { CollectionGeneratorPreview } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

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

export default function CreateCollectionPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("mystic-pixel-cult");
  const [tokenName, setTokenName] = useState("Frog Vault Token");
  const [tokenSymbol, setTokenSymbol] = useState("$FROG");
  const [tokenMint, setTokenMint] = useState("Frg111111111111111111111111111111111111111");
  const [logoUri, setLogoUri] = useState("https://example.com/frog-logo.png");
  const [description, setDescription] = useState("A swamp cult meme community that locks together, raids together, and unlocks toxic legendary traits.");
  const [memes, setMemes] = useState("lily hands, toxic bog, ribbit raid");
  const [phrases, setPhrases] = useState("lock the swamp, summon the prophet");
  const [mascotPreference, setMascotPreference] = useState("frog prophet");
  const [mood, setMood] = useState("fantasy");
  const [run, setRun] = useState<GeneratorRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (run ? mapRunToPreview(run, selectedPresetName(presets, selectedPreset)) : null), [run, presets, selectedPreset]);

  useEffect(() => {
    fetchJson<Preset[]>("/generator/presets")
      .then((data) => {
        setPresets(data);
        if (data[0] && !data.some((preset) => preset.id === selectedPreset)) setSelectedPreset(data[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, [selectedPreset]);

  async function createRun() {
    await action(async () => {
      const data = await fetchJson<GeneratorRun>("/generator/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
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

  async function mutateRun(path: string) {
    if (!run) return;
    await action(async () => {
      const data = await fetchJson<GeneratorRun>(`/generator/runs/${run.id}/${path}`, { method: "POST" });
      setRun(data);
    });
  }

  async function reloadRun() {
    if (!run) return;
    await action(async () => setRun(await fetchJson<GeneratorRun>(`/generator/runs/${run.id}`)));
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

  return (
    <AppShell active="create">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">Premium NFT Generator</p>
            <h1 className="mt-2 max-w-4xl text-4xl font-black">Create a persisted, art-directed collection identity.</h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              This flow now calls the real generator API. Runs, regenerated versions, preview assets, scores, and approval state are stored in Supabase through Prisma.
            </p>
          </div>
          <SectionCard title="Persistence Status">
            <div className="space-y-3">
              <StatusPill accent={run?.status === "APPROVED" ? "green" : run ? "purple" : "gold"}>{run?.status ?? "No Run Yet"}</StatusPill>
              <p className="text-sm text-slate-400">{run ? `Run ID: ${run.id}` : "Create a run to persist generator state."}</p>
              {run ? <button onClick={reloadRun} className="h-10 w-full rounded-lg border border-vault-line bg-black/25 text-sm font-bold">Reload Persisted Run</button> : null}
            </div>
          </SectionCard>
        </div>

        {error ? <div className="rounded-lg border border-vault-red/40 bg-vault-red/10 p-4 text-sm text-vault-red">{error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <SectionCard title="Token Inputs">
              <div className="space-y-3">
                <Field label="Token name" value={tokenName} onChange={setTokenName} />
                <Field label="Token symbol" value={tokenSymbol} onChange={setTokenSymbol} />
                <Field label="Mint address" value={tokenMint} onChange={setTokenMint} />
                <Field label="Logo URL" value={logoUri} onChange={setLogoUri} icon={Upload} />
                <label className="block">
                  <span className="text-sm text-slate-400">Short description / vibe</span>
                  <textarea className="mt-2 min-h-24 w-full rounded-lg border border-vault-line bg-black/25 px-4 py-3 text-sm outline-none focus:border-vault-purple" value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Community Context">
              <div className="space-y-3">
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
              <button type="button" onClick={createRun} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Create Persisted Run
              </button>
              <button type="button" onClick={() => mutateRun("regenerate-style")} disabled={!run || loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-purple/50 bg-vault-purple/10 px-4 text-sm font-bold text-vault-purple disabled:opacity-50">
                <RefreshCcw className="size-4" /> Regenerate Style
              </button>
              <button type="button" onClick={() => mutateRun("regenerate-previews")} disabled={!run || loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-4 text-sm font-bold disabled:opacity-50">
                <Wand2 className="size-4 text-vault-green" /> Regenerate Previews
              </button>
              <button type="button" onClick={() => mutateRun("approve")} disabled={!run || loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-green/50 bg-vault-green/10 px-4 text-sm font-bold text-vault-green disabled:opacity-50">
                <ShieldCheck className="size-4" /> Approve Version
              </button>
            </div>

            {preview ? (
              <CollectionPreview preview={preview} />
            ) : (
              <SectionCard title="No Preview Yet">
                <div className="rounded-lg border border-dashed border-vault-purple/40 bg-vault-purple/10 p-8 text-center text-slate-300">
                  Create a generator run to fetch the persisted avatar, banner, sample NFTs, trait table, lore, raid theme, quality report, and distinctiveness report.
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
        <input className={`h-11 w-full rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple ${Icon ? "pl-10" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
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

