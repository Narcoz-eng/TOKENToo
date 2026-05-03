import type { ArtPreset } from "./generator.types";

export const artPresets: ArtPreset[] = [
  {
    id: "mystic-pixel-cult",
    name: "Mystic Pixel Cult",
    artStyle: "premium pixel fantasy",
    mood: "ritual, secretive, glowing",
    shapeLanguage: "rounded organic",
    visualFx: ["toxic particles", "ritual glow", "mist bloom", "floating sigils"],
    mascotBias: ["frog", "wizard", "alien"],
    backgroundWorlds: ["haunted swamp temples", "moonlit bog altars", "ruined lily shrines"],
    traitNouns: ["Prophet Hood", "Lily Staff", "Bog Crown", "Toxic Mire Aura", "Ritual Lantern"],
    legendaryDirection: "ancient king composition with oversized crown, temple gate, and sacred glow",
    animationDirection: "green aura pulse with slow particles and sigil shimmer"
  },
  {
    id: "cyber-alley-syndicate",
    name: "Cyber Alley Syndicate",
    artStyle: "neon comic cyberpunk",
    mood: "slick, dangerous, underground",
    shapeLanguage: "sharp glitch",
    visualFx: ["neon rim light", "scanline rain", "glitch shards", "hologram haze"],
    mascotBias: ["cat", "robot", "alien"],
    backgroundWorlds: ["wet neon alley", "hacker den rooftops", "electric market backstreets"],
    traitNouns: ["Chrome Visor", "Backstreet Jacket", "Static Claws", "Signal Halo", "Night Market Blade"],
    legendaryDirection: "boss syndicate portrait with hologram city and chrome legendary hardware",
    animationDirection: "glitch flicker, moving rain, and neon sign pulse"
  },
  {
    id: "meme-kingdom",
    name: "Meme Kingdom",
    artStyle: "royal meme cartoon",
    mood: "loud, funny, victorious",
    shapeLanguage: "rounded heraldic",
    visualFx: ["gold sparks", "banner shimmer", "coin confetti", "crown flare"],
    mascotBias: ["dog", "frog", "coin mascot"],
    backgroundWorlds: ["moon castle courtyard", "throne room of memes", "golden kennel keep"],
    traitNouns: ["Raid Crown", "Moon Kennel Cape", "Golden Bark", "Meme Scepter", "Victory Banner"],
    legendaryDirection: "full royal throne scene with meme banners and impossible gold glow",
    animationDirection: "crown shine, falling coins, and waving kingdom banners"
  },
  {
    id: "neon-samurai",
    name: "Neon Samurai",
    artStyle: "cinematic neon anime",
    mood: "disciplined, sharp, premium",
    shapeLanguage: "sharp armored",
    visualFx: ["katana glint", "plasma fog", "neon smoke", "ember trails"],
    mascotBias: ["samurai", "dog", "robot"],
    backgroundWorlds: ["rainy cyber dojo", "neon bamboo bridge", "midnight shrine district"],
    traitNouns: ["Plasma Kabuto", "Ronin Mask", "Moon Katana", "Shrine Aura", "War Banner"],
    legendaryDirection: "samurai champion pose with crossed blades, shrine gate, and cinematic smoke",
    animationDirection: "blade shimmer, drifting embers, and aura wave"
  },
  {
    id: "dark-fantasy-raiders",
    name: "Dark Fantasy Raiders",
    artStyle: "dark fantasy painterly",
    mood: "aggressive, mythic, dangerous",
    shapeLanguage: "jagged organic",
    visualFx: ["shadow smoke", "blood moon glow", "cursed sparks", "ash noise"],
    mascotBias: ["skull", "frog", "dog", "wizard"],
    backgroundWorlds: ["cursed raid fortress", "black mountain gate", "ancient war crypt"],
    traitNouns: ["Raid Helm", "Ashen Cloak", "Cursed Standard", "Warlock Eyes", "Bone Relic"],
    legendaryDirection: "mythic warlord scene with fortress silhouette and cursed moon",
    animationDirection: "shadow pulse, ash drift, and red moon glow"
  },
  {
    id: "alien-casino",
    name: "Alien Casino",
    artStyle: "cosmic casino cartoon",
    mood: "chaotic, lucky, strange",
    shapeLanguage: "rounded surreal",
    visualFx: ["cosmic glitter", "slot glow", "plasma chips", "nebula smoke"],
    mascotBias: ["alien", "coin mascot", "robot"],
    backgroundWorlds: ["orbital casino floor", "nebula jackpot room", "zero-g poker lounge"],
    traitNouns: ["Jackpot Visor", "Nebula Chips", "Lucky Raygun", "Casino Crown", "Plasma Tux"],
    legendaryDirection: "one-of-one alien high roller with jackpot machine and cosmic vault",
    animationDirection: "slot sparkle, floating chips, and nebula aura pulse"
  },
  {
    id: "robot-warband",
    name: "Robot Warband",
    artStyle: "industrial mech poster",
    mood: "heavy, tactical, electric",
    shapeLanguage: "geometric armored",
    visualFx: ["electric arcs", "factory sparks", "hologram grids", "oil smoke"],
    mascotBias: ["robot", "skull", "coin mascot"],
    backgroundWorlds: ["neon machine guild", "war factory hangar", "reactor command room"],
    traitNouns: ["Reactor Core", "Warband Plate", "Targeting Eyes", "Mech Banner", "Pulse Hammer"],
    legendaryDirection: "commander robot with reactor wings and warband army silhouettes",
    animationDirection: "reactor pulse, electric arcs, and mechanical HUD movement"
  },
  {
    id: "luxury-crown-club",
    name: "Luxury Crown Club",
    artStyle: "premium luxury cartoon",
    mood: "exclusive, polished, high-status",
    shapeLanguage: "clean ornate",
    visualFx: ["diamond sparkle", "velvet glow", "gold foil shine", "champagne mist"],
    mascotBias: ["dog", "cat", "coin mascot"],
    backgroundWorlds: ["velvet vault lounge", "diamond club terrace", "gold treasury salon"],
    traitNouns: ["Diamond Crown", "Velvet Cape", "Treasury Monocle", "Gold Signet", "Founder Chalice"],
    legendaryDirection: "exclusive founder portrait with diamond frame and treasury lounge",
    animationDirection: "diamond twinkle, gold foil sweep, and soft premium glow"
  }
];

export function getPreset(id?: string) {
  return artPresets.find((preset) => preset.id === id) ?? artPresets[0];
}

