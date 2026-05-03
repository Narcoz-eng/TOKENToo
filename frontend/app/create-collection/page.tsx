"use client";

import { useMemo, useState } from "react";
import { Check, Palette, RefreshCcw, ShieldCheck, Sparkles, Upload, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionPreview } from "@/components/CollectionPreview";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import type { CollectionGeneratorPreview } from "@/lib/types";

const presets = [
  "Mystic Pixel Cult",
  "Cyber Alley Syndicate",
  "Meme Kingdom",
  "Neon Samurai",
  "Dark Fantasy Raiders",
  "Alien Casino",
  "Robot Warband",
  "Luxury Crown Club"
];

const presetImages: Record<string, string> = {
  "Mystic Pixel Cult": "/art/frog-vault-v2.png",
  "Cyber Alley Syndicate": "/art/cat-syndicate-v2.png",
  "Meme Kingdom": "/art/doge-kingdom-v2.png",
  "Neon Samurai": "/art/shiba-samurai-v2.png",
  "Dark Fantasy Raiders": "/art/pepe-empire-v2.png",
  "Alien Casino": "/art/pepe-empire-v2.png",
  "Robot Warband": "/art/cat-syndicate-v2.png",
  "Luxury Crown Club": "/art/doge-kingdom-v2.png"
};

export default function CreateCollectionPage() {
  const [step, setStep] = useState(1);
  const [preset, setPreset] = useState(presets[0]);
  const [regen, setRegen] = useState(0);
  const [approved, setApproved] = useState(false);
  const preview = useMemo(() => buildPreview(preset, regen), [preset, regen]);

  return (
    <AppShell active="create">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">Premium NFT Generator</p>
            <h1 className="mt-2 max-w-4xl text-4xl font-black">Create a collection identity that feels art-directed, not templated.</h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Upload token context, choose a premium direction, review avatar/banner/sample NFTs, and approve the generator run before the collection can launch.
            </p>
          </div>
          <SectionCard title="Generator Status">
            <div className="space-y-3">
              <StatusPill accent={approved ? "green" : "purple"}>{approved ? "Approved" : "Awaiting Approval"}</StatusPill>
              <div className="rounded-lg border border-vault-line bg-black/25 p-3 text-sm text-slate-300">
                Blockchain creation remains gated until the art direction, trait table, lore, raid theme, roles, quality score, and distinctiveness score are approved.
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <SectionCard title="Workflow">
              <div className="space-y-2">
                {["Inputs", "Context", "Preset", "Preview", "Approve"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(index + 1)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm ${step === index + 1 ? "border-vault-purple bg-vault-purple/20" : "border-vault-line bg-black/25"}`}
                  >
                    <span>{index + 1}. {label}</span>
                    {index + 1 < step || approved ? <Check className="size-4 text-vault-green" /> : null}
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Token Inputs">
              <div className="space-y-3">
                <Field label="Token name" value="Frog Vault Token" />
                <Field label="Token symbol" value="$FROG" />
                <Field label="Mint address" value="Frg111111111111111111111111111111111111111" />
                <label className="block">
                  <span className="text-sm text-slate-400">Token logo</span>
                  <div className="mt-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-vault-purple/50 bg-vault-purple/10 text-sm text-vault-purple">
                    <Upload className="mr-2 size-4" /> Upload logo or paste URL
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">Short description / vibe</span>
                  <textarea className="mt-2 min-h-24 w-full rounded-lg border border-vault-line bg-black/25 px-4 py-3 text-sm outline-none focus:border-vault-purple" defaultValue="A swamp cult meme community that locks together, raids together, and unlocks toxic legendary traits." />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Community Context">
              <div className="space-y-3">
                <Field label="Memes / inside jokes" value="lily hands, toxic bog, ribbit raid" />
                <Field label="Telegram / X phrases" value="lock the swamp, summon the prophet" />
                <Field label="Mascot preference" value="frog prophet" />
                <Field label="Mood" value="dark, funny, fantasy" />
              </div>
            </SectionCard>
          </aside>

          <main className="space-y-5">
            <SectionCard title="Premium Art Presets">
              <div className="grid gap-3 md:grid-cols-4">
                {presets.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setPreset(item);
                      setApproved(false);
                    }}
                    className={`rounded-lg border p-3 text-left transition hover:border-vault-purple ${preset === item ? "border-vault-purple bg-vault-purple/20" : "border-vault-line bg-black/25"}`}
                  >
                    <img src={presetImages[item]} alt="" className="mb-3 aspect-square w-full rounded-lg object-cover" />
                    <p className="font-bold">{item}</p>
                    <p className="mt-1 text-xs text-slate-400">{presetCopy(item)}</p>
                  </button>
                ))}
              </div>
            </SectionCard>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setRegen((value) => value + 1);
                  setApproved(false);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-purple/50 bg-vault-purple/10 px-4 text-sm font-bold text-vault-purple"
              >
                <RefreshCcw className="size-4" /> Regenerate Style
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegen((value) => value + 7);
                  setApproved(false);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-4 text-sm font-bold"
              >
                <Wand2 className="size-4 text-vault-green" /> Regenerate Previews
              </button>
              <button
                type="button"
                onClick={() => setApproved(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow"
              >
                <ShieldCheck className="size-4" /> Approve Generator Run
              </button>
            </div>

            <CollectionPreview preview={preview} />

            <SectionCard title="API Contract">
              <div className="grid gap-3 md:grid-cols-3">
                <ApiStep icon={Palette} label="POST /generator/runs" text="Capture token, logo, hints, preset, and create persisted preview state." />
                <ApiStep icon={Sparkles} label="POST regenerate" text="Reroll style or samples while keeping every version auditable." />
                <ApiStep icon={ShieldCheck} label="POST approve" text="Lock the approved trait pack and enable collection creation." />
              </div>
            </SectionCard>
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <input className="mt-2 h-11 w-full rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple" defaultValue={value} />
    </label>
  );
}

function ApiStep({ icon: Icon, label, text }: { icon: typeof Palette; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-4">
      <Icon className="mb-3 size-6 text-vault-purple" />
      <p className="font-bold">{label}</p>
      <p className="mt-1 text-sm text-slate-400">{text}</p>
    </div>
  );
}

function buildPreview(preset: string, regen: number): CollectionGeneratorPreview {
  const image = presetImages[preset] ?? "/art/frog-vault-v2.png";
  const mascot = preset.includes("Cyber") ? "Neon Alley Oracle" : preset.includes("Kingdom") ? "Moon Kennel King" : preset.includes("Samurai") ? "Chrome Ronin Shiba" : preset.includes("Alien") ? "Nebula High Roller" : preset.includes("Robot") ? "Reactor War Marshal" : preset.includes("Luxury") ? "Diamond Crown Founder" : "Swamp Prophet";
  const theme = preset.includes("Cyber") ? "neon alley syndicate" : preset.includes("Kingdom") ? "meme kingdom court" : preset.includes("Samurai") ? "neon dojo clan" : preset.includes("Alien") ? "orbital casino guild" : preset.includes("Robot") ? "machine warband foundry" : preset.includes("Luxury") ? "velvet crown club" : "mystic swamp raiders";
  const palette = preset.includes("Cyber") ? ["#9a36ff", "#28d7ff", "#08091a"] : preset.includes("Kingdom") ? ["#f4c542", "#21f26b", "#1b1204"] : preset.includes("Samurai") ? ["#df8740", "#7a35ff", "#17070f"] : preset.includes("Luxury") ? ["#e6d28a", "#7a35ff", "#07050b"] : ["#21f26b", "#7a35ff", "#050712"];
  const traitLanguage = [
    "Toxic Bog Temple",
    "Swamp Prophet Hood",
    "Lily Staff",
    "Raid Crown",
    "Neon Mire Aura",
    "Moon Vault Sigil",
    "Ritual Lantern",
    "Ancient Founder Mask",
    "Guild War Banner",
    "Legendary Oracle Pulse"
  ].map((trait, index) => (regen % 2 && index % 2 ? trait.replace("Swamp", "Vault").replace("Bog", "Moon") : trait));

  return {
    id: `preview-${preset}-${regen}`,
    collection: "$FROG Vaults",
    preset,
    theme,
    mascot,
    artStyle: preset.toLowerCase(),
    palette,
    backgroundWorld: preset.includes("Cyber") ? "wet neon backstreets and server shrines" : preset.includes("Kingdom") ? "moon castle courtyards and golden kennel vaults" : "haunted swamp temples and glowing bog gates",
    lore: "Frog holders formed a faction around locked vaults, ritual raids, and toxic trait unlocks. Members earn status through mints, staking, raids, and collection wars.",
    raidTheme: regen % 2 ? "Moon Bog Treasury Strike" : "Swamp Takeover",
    roleNames: ["Swamp Founder", "Toxic Raider", "Lily Whale", "Bog Prophet", "Vault Marshal"],
    traitLanguage,
    traitCounts: {
      baseCharacter: 42,
      backgrounds: 60,
      headgear: 60,
      eyes: 44,
      mouthExpression: 32,
      outfitBody: 60,
      accessories: 80,
      auraEffect: 36,
      borderFrame: 18,
      legendaryOverlay: 12
    },
    rarityWeights: { Common: 55, Uncommon: 25, Rare: 12, Epic: 6, Legendary: 1.5, Mythic: 0.5 },
    unlocks: {
      level1: ["base traits"],
      level2: ["10 new backgrounds"],
      level3: ["10 new accessories"],
      level4: ["rare aura pack"],
      level5: ["legendary animated traits"]
    },
    avatar: image,
    banner: preset === "Mystic Pixel Cult" ? "/art/hero-frog-v2.png" : image,
    samples: Array.from({ length: 5 }, (_, index) => ({
      id: `sample-${index}`,
      name: ["Swamp Prophet", "Toxic Oracle", "Lily Marshal", "Bog Warden", "Ancient Frog King"][index],
      image,
      rarity: ["Rare", "Epic", "Rare", "Legendary", "Mythic"][index],
      role: ["OG Raider", "Top Holder", "Raid Master", "Founder", "Legendary Raider"][index],
      traits: [traitLanguage[index], traitLanguage[index + 4], `${index + 1} of 42 base variants`]
    })),
    quality: {
      previewQualityScore: 91,
      uniquenessScore: 96,
      colorHarmonyScore: 89,
      duplicateRiskScore: 98,
      compatibilityScore: 92,
      tier: preset.includes("Mystic") || preset.includes("Cyber") ? "Legendary-ready" : "Premium",
      passed: true
    },
    distinctiveness: {
      silhouetteUniqueness: 92,
      paletteUniqueness: 88,
      mascotUniqueness: 94,
      backgroundWorldUniqueness: 90,
      traitLanguageUniqueness: 96,
      score: 92,
      passed: true
    }
  };
}

function presetCopy(preset: string) {
  if (preset.includes("Cyber")) return "Sharp silhouettes, neon rain, glitch status.";
  if (preset.includes("Kingdom")) return "Royal meme traits, crowns, banners, gold.";
  if (preset.includes("Samurai")) return "Blade poses, shrine worlds, premium anime smoke.";
  if (preset.includes("Alien")) return "Casino worlds, jackpot traits, cosmic effects.";
  if (preset.includes("Robot")) return "Mech silhouettes, reactor glow, warband armor.";
  if (preset.includes("Luxury")) return "Diamond frames, velvet vaults, founder status.";
  if (preset.includes("Fantasy")) return "Cursed worlds, mythic raiders, boss energy.";
  return "Ritual mascots, swamp lore, glowing pixel fantasy.";
}

