export type CuratedAssetPack = {
  id: string;
  name: string;
  compatibleMascots: string[];
  worlds: string[];
  colorRules: string[];
  compositionRules: string[];
  typographyDirection: string;
  forbiddenCombinations: Array<{ trait: string; incompatibleWith: string[]; reason: string }>;
};

export const curatedAssetPacks: CuratedAssetPack[] = [
  {
    id: "mystic-swamp-cult",
    name: "Mystic Swamp Cult",
    compatibleMascots: ["frog", "wizard", "skull"],
    worlds: ["toxic bog temples", "haunted lily shrines", "neon mire ritual rooms"],
    colorRules: ["neon green must remain readable over deep purple", "gold accents reserved for rare tiers"],
    compositionRules: ["large expressive mascot silhouette", "staff or relic should frame the face, not cover it"],
    typographyDirection: "jagged fantasy pixel labels with ritual glyph accents",
    forbiddenCombinations: [{ trait: "Swamp Prophet Hood", incompatibleWith: ["Bog Crown", "Raid Helmet"], reason: "headgear overlap" }]
  },
  {
    id: "meme-kingdom",
    name: "Meme Kingdom",
    compatibleMascots: ["dog", "coin mascot"],
    worlds: ["shibe throne rooms", "moon parade castles", "diamond paw arenas"],
    colorRules: ["royal gold and meme orange need dark contrast", "crowns should be visibly rare"],
    compositionRules: ["heroic centered mascot", "banner and collar readable at card size"],
    typographyDirection: "bold meme royal seal typography",
    forbiddenCombinations: [{ trait: "Moon General Crown", incompatibleWith: ["Rocket Helmet"], reason: "competing royal headgear" }]
  },
  {
    id: "cyber-alley-syndicate",
    name: "Cyber Alley Syndicate",
    compatibleMascots: ["cat", "alien"],
    worlds: ["night market rooftops", "neon alley exchanges", "hacker balcony dens"],
    colorRules: ["cyan and magenta accents over black-blue city lighting", "avoid same-color mascot and skyline"],
    compositionRules: ["asymmetric stealth pose", "visor glow should define status"],
    typographyDirection: "compressed cyberpunk terminal labels",
    forbiddenCombinations: [{ trait: "Cyber Alley Visor", incompatibleWith: ["Laser Eyes"], reason: "eye effects overlap" }]
  },
  {
    id: "robot-warband",
    name: "Robot Warband",
    compatibleMascots: ["robot", "skull"],
    worlds: ["neon machine guild halls", "rusted reactor yards", "chrome battle foundries"],
    colorRules: ["metal bases need colored core glow", "avoid low-contrast grey-on-grey traits"],
    compositionRules: ["angular mechanical silhouette", "core reactor centered as rarity signal"],
    typographyDirection: "industrial stencil and circuit marks",
    forbiddenCombinations: [{ trait: "Overclock Halo", incompatibleWith: ["Chrome War Helmet"], reason: "halo hidden by helmet" }]
  },
  {
    id: "alien-casino",
    name: "Alien Casino",
    compatibleMascots: ["alien", "coin mascot"],
    worlds: ["orbital casino floors", "nebula jackpot rooms", "plasma card tables"],
    colorRules: ["violet, teal, and gold must separate foreground from jackpot backgrounds"],
    compositionRules: ["wide eyes and chips create instant read", "legendary overlays use orbital particles"],
    typographyDirection: "slick casino neon typography",
    forbiddenCombinations: [{ trait: "Nebula Jackpot Crown", incompatibleWith: ["Plasma Visor"], reason: "face readability" }]
  },
  {
    id: "neon-samurai",
    name: "Neon Samurai",
    compatibleMascots: ["dog", "cat", "frog"],
    worlds: ["rain-soaked dojo markets", "purple lantern rooftops", "green katana courtyards"],
    colorRules: ["blade glow should contrast armor", "do not hide eyes with dark helmets"],
    compositionRules: ["three-quarter warrior pose", "weapon silhouette must remain outside face area"],
    typographyDirection: "clean kanji-inspired futuristic labels",
    forbiddenCombinations: [{ trait: "Ronin Kabuto", incompatibleWith: ["Raid Crown"], reason: "headgear overlap" }]
  },
  {
    id: "luxury-crown-club",
    name: "Luxury Crown Club",
    compatibleMascots: ["coin mascot", "dog", "cat"],
    worlds: ["diamond club terraces", "velvet vault lounges", "private crown galleries"],
    colorRules: ["black, platinum, and neon purple with limited gold", "mythic traits must look expensive"],
    compositionRules: ["premium portrait crop", "monocle and crown must be readable"],
    typographyDirection: "high-end editorial serif mixed with neon UI tags",
    forbiddenCombinations: [{ trait: "Diamond Monocle", incompatibleWith: ["Chrome Visor"], reason: "eye accessory conflict" }]
  },
  {
    id: "dark-fantasy-raiders",
    name: "Dark Fantasy Raiders",
    compatibleMascots: ["skull", "wizard", "frog"],
    worlds: ["ancient war crypts", "cursed fortress gates", "moonlit raid fields"],
    colorRules: ["green or violet magic effects must separate from black armor", "blood-red accents capped to rare tiers"],
    compositionRules: ["dramatic villain silhouette", "legendary traits add full-scene lighting"],
    typographyDirection: "dark fantasy title-card lettering",
    forbiddenCombinations: [{ trait: "Cursed War Hood", incompatibleWith: ["Bone Crown"], reason: "headgear overlap" }]
  }
];

export function selectAssetPack(mascot: string, vocabulary: string[]) {
  const haystack = `${mascot} ${vocabulary.join(" ")}`.toLowerCase();
  return (
    curatedAssetPacks
      .map((pack) => ({
        pack,
        score:
          pack.compatibleMascots.filter((item) => haystack.includes(item)).length * 5 +
          pack.worlds.filter((item) => item.split(/\s+/).some((word) => haystack.includes(word))).length
      }))
      .sort((a, b) => b.score - a.score)[0]?.pack ?? curatedAssetPacks[0]
  );
}
