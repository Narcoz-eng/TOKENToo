import type { ArtTeamId, ArtTeamProfile, CreateGenerationRunInput, GeneratedStyleProfile, TraitCategoryRole } from "./generator.types";

const role = (items: Partial<Record<TraitCategoryRole, string[]>>) => items;

export const artTeams: Record<ArtTeamId, ArtTeamProfile> = {
  DEGENLAB: {
    id: "DEGENLAB",
    name: "DegenLab",
    lineLanguage: "dirty meme sketch, rough black ink, impatient marker strokes, grunge splatter",
    anatomyRules: "squat collectible mascot anatomy, tired eyelids, hunched trading posture, expressive hands",
    shapeLanguage: "wide frog heads, small bodies, heavy hood silhouettes, messy props",
    palettePhilosophy: "swamp greens, black ink, nicotine beige, warning red, terminal cyan, paper cream",
    textureDensity: "high ink noise and paper grit, but face remains readable at 64px",
    detailBudget: "traits are loud and socially legible; avoid polished fantasy rendering",
    moodVocabulary: ["dead inside", "smug", "panic bid", "sleep deprived", "rage sell", "hopium", "locked in", "not impressed", "FOMO"],
    expressionSystem: "droopy eyes, sideways pupils, crooked mouths, cigarette or caffeine mouth props only when rotated",
    traitPhilosophy: "every trait should feel like trader behavior, desk trash, terminal addiction, or meme survival",
    rarityEscalationPhilosophy: "rarity is access, status, and story, not glow spam",
    mythicLegendaryRules: ["no hood-halo-void-staff formula", "mythic must be a collection-native market legend", "legendary should feel expensive but still ugly-beautiful"],
    thumbnailReadabilityRules: ["eyes and mouth must read first", "hat silhouette must differ per rarity", "prop must be identifiable as a meme/trading object"],
    nativeArchetypes: ["market survivor", "liquidity kingpin", "terminal addict", "trench prophet", "caffeinated billionaire", "chart warlord"],
    nativeTraitCatalog: role({
      base: ["Classic Frog", "Sleepy Frog", "Spotted Trader Frog", "Dark Green Hacker Frog", "Gold Frog", "Trench Prophet Frog", "Caffeinated Kingpin"],
      head: ["NGMI Beanie", "Bucket Hat", "Headphones", "Desk Cap", "Tech Visor", "Crown", "Tinfoil Chart Hat", "Greasy Snapback"],
      eyes: ["Tired Eyes", "Side Eye", "Bloodshot Eyes", "Laser Focus", "Dollar Eyes", "Panic Bid Eyes", "Not Impressed Eyes", "Glitch Monitor Eyes"],
      mouth: ["Neutral Frown", "Smirk", "Cigarette", "Gold Tooth", "Grillz", "Skull Grin", "Tongue Out", "Bubblegum"],
      body: ["NGMI Hoodie", "Puffer Vest", "Crumpled Suit", "Cyber Jacket", "Fur Coat", "Reaper Cloak", "Coffee-Stained Tee", "Floor Trader Vest"],
      prop: ["Coffee", "Energy Drink", "Tablet", "Laptop", "Champagne", "Scythe", "Phone Chart", "Money Stack", "Candle Printout"],
      background: ["Bedroom", "Messy Desk", "Trading Floor", "Command Center", "Penthouse", "Exit-Liquidity Shrine", "Liquidation Alley", "After Hours Terminal"],
      aura: ["None", "Green Smoke", "Red Glitch", "Purple Glitch", "Gold Drip", "Chart Static", "Caffeine Steam", "Liquidation Sparks"]
    })
  },
  SOFTROOM_STUDIO: {
    id: "SOFTROOM_STUDIO",
    name: "Softroom Studio",
    lineLanguage: "clean soft cartoon line, sticker edge, plush contour, minimal texture",
    anatomyRules: "rounded mascot proportions, soft paws, oversized head, friendly silhouette",
    shapeLanguage: "rounded triangles, soft blobs, simple hats, cozy props",
    palettePhilosophy: "warm neutrals, candy accents, soft shadows, readable sticker contrast",
    textureDensity: "low texture, gentle paper or plush grain",
    detailBudget: "few but iconic traits; every item must work as a sticker",
    moodVocabulary: ["chill", "sleepy", "confused", "blep", "smug", "side-eye", "tired", "excited", "shocked"],
    expressionSystem: "tiny mouths, dot eyes, blep tongues, relaxed eyelids, soft cheek marks",
    traitPhilosophy: "traits are cozy flexes, internet-famous pet items, snack culture, and hat identity",
    rarityEscalationPhilosophy: "rarity adds social warmth, collector status, and plush-world story",
    mythicLegendaryRules: ["mythic must stay cozy", "no cosmic god form", "prestige is internet-famous charm"],
    thumbnailReadabilityRules: ["silhouette must read as dog/pet instantly", "hat and mouth should be clear at tiny size"],
    nativeArchetypes: ["internet-famous pup", "sleepy flex", "plush king", "cozy streamer", "legendary hat holder"],
    nativeTraitCatalog: role({
      base: ["Cream Pup", "Tan Pup", "Black-Ear Pup", "Tiny Shiba", "Plush King Pup", "Streamer Pup"],
      head: ["Beanie", "Bucket Hat", "Sleep Mask", "Crown Cap", "Headset", "Blanket Hood", "Party Hat"],
      eyes: ["Dot Eyes", "Sleepy Eyes", "Side Eye", "Sparkle Eyes", "Shocked Eyes", "Smug Eyes"],
      mouth: ["Tiny Smile", "Blep", "Snack Chew", "Confused Mouth", "Yawn", "Smug Mouth"],
      body: ["Cozy Hoodie", "Blanket Wrap", "Pajama Fit", "Streamer Jacket", "Plush Robe", "Tiny Vest"],
      prop: ["Tennis Ball", "Snack Bag", "Juice Box", "Phone Stream", "Tiny Crown Pillow", "Treat Jar"],
      background: ["Cozy Room", "Couch Stream", "Snack Desk", "Soft Studio", "Blanket Fort", "Internet Fame Stage"],
      aura: ["None", "Warm Glow", "Heart Stickers", "Nap Zs", "Confetti", "Soft Sparkles"]
    })
  },
  PAPERGHOST: {
    id: "PAPERGHOST",
    name: "Paperghost",
    lineLanguage: "minimal pencil and ink, lonely negative space, fragile hand marks",
    anatomyRules: "simple ghost forms, slumped posture, tiny hands, emotional emptiness",
    shapeLanguage: "thin sheets, torn paper edges, small relics, quiet silhouettes",
    palettePhilosophy: "paper cream, graphite, muted blue, faded red, archive gray",
    textureDensity: "low to medium; paper grain and pencil pressure carry emotion",
    detailBudget: "one or two emotionally sharp details per piece",
    moodVocabulary: ["forgotten", "watching", "tired", "quiet", "cursed", "hopeful", "hollow", "waiting"],
    expressionSystem: "small eyes, almost no mouth, posture and props carry the feeling",
    traitPhilosophy: "traits are memories, archive objects, lost notes, and haunted keepsakes",
    rarityEscalationPhilosophy: "rarity deepens memory and silence, not effects",
    mythicLegendaryRules: ["no universal void deity", "mythic is a specific abandoned memory", "legendary must remain emotionally simple"],
    thumbnailReadabilityRules: ["one clean ghost silhouette", "one readable relic", "no busy background"],
    nativeArchetypes: ["forgotten spirit", "archive guardian", "abandoned memory", "silent watcher", "lonely wanderer"],
    nativeTraitCatalog: role({
      base: ["Plain Ghost", "Torn Ghost", "Ink-Stained Ghost", "Archive Ghost", "Lantern Ghost", "Memory Ghost"],
      head: ["Paper Crown", "Old Ribbon", "Library Tag", "Broken Halo Pin", "Rain Cap", "Thread Knot"],
      eyes: ["Dot Eyes", "Hollow Eyes", "Tired Eyes", "Watery Eyes", "Watcher Eyes", "Closed Eyes"],
      mouth: ["No Mouth", "Tiny Frown", "Little O", "Stitched Mouth", "Soft Smile", "Shiver Line"],
      body: ["Blank Sheet", "Torn Sheet", "Archive Cloak", "Rain Sheet", "Pencil Shade", "Memory Wrap"],
      prop: ["Old Key", "Letter", "Lantern", "Photo", "Library Card", "Tiny Bell"],
      background: ["Empty Room", "Archive Shelf", "Rain Window", "Abandoned Hall", "Moon Desk", "Forgotten Garden"],
      aura: ["None", "Pencil Dust", "Faint Glow", "Rain Lines", "Memory Specks", "Quiet Static"]
    })
  },
  MOSSWORKS: {
    id: "MOSSWORKS",
    name: "Mossworks",
    lineLanguage: "storybook ink, watercolor wash, soft organic contour",
    anatomyRules: "small forest creature anatomy, handmade asymmetry, natural posture",
    shapeLanguage: "leaves, antlers, mushrooms, lanterns, mossy cloaks",
    palettePhilosophy: "moss green, bark brown, lantern gold, fog blue, parchment",
    textureDensity: "medium watercolor granulation and leaf detail",
    detailBudget: "organic details cluster around head, cloak, and props",
    moodVocabulary: ["curious", "gentle", "ancient", "watchful", "brave", "lost", "glowing", "sleepy"],
    expressionSystem: "soft eyes, tiny mouths, posture and lantern position show mood",
    traitPhilosophy: "traits are natural artifacts, forest roles, seasonal marks, and story objects",
    rarityEscalationPhilosophy: "rarity means deeper forest role and older myth",
    mythicLegendaryRules: ["no cosmic background", "mythic must be forest-native", "prestige comes from ancient nature symbols"],
    thumbnailReadabilityRules: ["head silhouette and lantern/leaf prop must read", "background stays watercolor soft"],
    nativeArchetypes: ["forest guardian", "lantern keeper", "ancient wanderer", "moss deity", "root oracle"],
    nativeTraitCatalog: role({
      base: ["Mossling", "Fern Sprite", "Bark Creature", "Lantern Keeper", "Ancient Wanderer", "Moss Deity"],
      head: ["Leaf Cap", "Mushroom Hat", "Twig Antlers", "Flower Crown", "Acorn Helm", "Moss Crown"],
      eyes: ["Dew Eyes", "Sleepy Eyes", "Lantern Eyes", "Ancient Eyes", "Wide Curious Eyes"],
      mouth: ["Tiny Smile", "Quiet Mouth", "O Mouth", "Leaf Chew", "Wise Frown"],
      body: ["Moss Cloak", "Bark Vest", "Fern Wrap", "Rain Poncho", "Root Robe"],
      prop: ["Lantern", "Walking Stick", "Seed Pouch", "Map Leaf", "Mushroom Staff", "Ancient Bell"],
      background: ["Forest Path", "Mushroom Ring", "Fog Grove", "Lantern Bridge", "Ancient Stump", "Moss Temple"],
      aura: ["None", "Fireflies", "Pollen Glow", "Mist", "Leaf Swirl", "Lantern Halo"]
    })
  },
  PIXEL_REBEL: {
    id: "PIXEL_REBEL",
    name: "Pixel Rebel",
    lineLanguage: "crisp pixels, dither texture, glitch edges, graffiti accents",
    anatomyRules: "compact robot/signal bodies, screen faces, modular limbs, readable 16-bit silhouette",
    shapeLanguage: "square heads, antennas, masks, cables, signal bars",
    palettePhilosophy: "black, dark gray, cyan, violet, hot pink, acid yellow, one neon green",
    textureDensity: "pixel noise and glitch fragments, never blurry",
    detailBudget: "pixel detail must survive at 64px; no micro-noise inside face",
    moodVocabulary: ["neutral", "happy", "angry", "sad", "hype", "glitched", "sleepy", "focused", "love", "WTF"],
    expressionSystem: "screen emotion icons, X eyes, bars, scanlines, pixel mouths",
    traitPhilosophy: "traits are network tools, masks, bootleg devices, street tech, and broadcast symbols",
    rarityEscalationPhilosophy: "rarity unlocks signal control, street status, and glitch identity",
    mythicLegendaryRules: ["no generic cyber god", "mythic is a network-native idol or phantom", "keep pixel language consistent"],
    thumbnailReadabilityRules: ["screen face must read", "single dominant neon accent", "avoid tiny UI clutter"],
    nativeArchetypes: ["signal ghost", "broadcast hacker", "glitch idol", "network phantom", "alley protocol"],
    nativeTraitCatalog: role({
      base: ["Lo-Res Bot", "Street Bot", "Signal Bot", "Hacker Bot", "Glitch Idol", "Network Phantom"],
      head: ["Antenna Cap", "Hood Module", "Cat-Ear Screen", "Broadcast Crown", "Broken Visor", "Signal Mask"],
      eyes: ["Cyan Screen", "X Eyes", "Angry Pixels", "Sleepy Bars", "Heart Screen", "404 Eyes", "Glitch Eyes"],
      mouth: ["Pixel Smile", "Flat Bar", "Static Mouth", "WTF Mouth", "Love Mouth", "Broken Line"],
      body: ["Black Hoodie", "Patch Jacket", "Cable Vest", "Neon Armor", "Broadcast Robe", "Glitch Cloak"],
      prop: ["USB Charm", "Spray Can", "Data Blade", "Signal Brick", "Cassette Drive", "Neon Remote"],
      background: ["Back Alley", "Rooftop Signal", "Arcade Wall", "Server Room", "Graffiti Street", "Broadcast Tower"],
      aura: ["None", "Dither Noise", "Pink Glitch", "Cyan Scanline", "Signal Burst", "Broken Pixels"]
    })
  },
  VOID_SKETCH: {
    id: "VOID_SKETCH",
    name: "Void Sketch",
    lineLanguage: "punk marker, spray paint, xerox grain, broken collage lines",
    anatomyRules: "angular street mascot anatomy, aggressive lean, sharp hand gestures",
    shapeLanguage: "spikes, torn stickers, masks, tags, ripped silhouettes",
    palettePhilosophy: "black ink, dirty white, toxic accent, spray pink, warning yellow",
    textureDensity: "heavy marker/spray texture with controlled face read",
    detailBudget: "chaotic edges, clean central read",
    moodVocabulary: ["defiant", "side-eye", "unimpressed", "feral", "wired", "laughing", "ready", "burned out"],
    expressionSystem: "marker eyes, jagged mouths, sticker scars, aggressive brows",
    traitPhilosophy: "traits are street artifacts, protest marks, bootleg fashion, and broken tech",
    rarityEscalationPhilosophy: "rarity adds social danger, street lore, and symbolic takeover",
    mythicLegendaryRules: ["no cosmic void staff", "mythic is a street-native icon", "keep punk marker language"],
    thumbnailReadabilityRules: ["one face mark, one head silhouette, one bold prop", "do not bury mascot in graffiti"],
    nativeArchetypes: ["street prophet", "tag king", "signal vandal", "bootleg saint", "back-alley legend"],
    nativeTraitCatalog: role({
      base: ["Marker Mascot", "Sticker Scar Mascot", "Street Punk", "Signal Vandal", "Bootleg Saint", "Back-Alley Legend"],
      head: ["Ripped Beanie", "Spray Cap", "Spike Crown", "Sticker Mask", "Bandana", "Broken Goggles"],
      eyes: ["Marker Eyes", "Side-Eye", "Red Glare", "Crossed Eyes", "Wired Eyes", "Tag Eyes"],
      mouth: ["Jagged Grin", "Flat Mouth", "Laugh Mouth", "Snarl", "Tape Mouth", "Gold Tooth"],
      body: ["Patch Hoodie", "Ripped Jacket", "Spray Vest", "Bootleg Coat", "Tag Robe"],
      prop: ["Spray Can", "Sticker Sheet", "Broken Phone", "Chain", "Marker", "Bootleg Flag"],
      background: ["Tagged Wall", "Back Alley", "Underpass", "Rooftop", "Abandoned Shop", "Street Shrine"],
      aura: ["None", "Spray Mist", "Xerox Noise", "Sticker Burst", "Toxic Drip", "Static Tags"]
    })
  }
};

export function selectArtTeam(input: CreateGenerationRunInput, textExtra = ""): ArtTeamProfile {
  if (input.hints?.artTeamOverride && artTeams[input.hints.artTeamOverride]) return artTeams[input.hints.artTeamOverride];
  const source = [
    input.tokenName,
    input.tokenSymbol,
    input.description,
    input.hints?.mascotPreference,
    input.hints?.themePreference,
    input.hints?.styleSubtype,
    input.hints?.sourceMetadata?.name,
    input.hints?.sourceMetadata?.symbol,
    input.hints?.sourceMetadata?.description,
    JSON.stringify(input.hints?.sourceMetadata?.extensions ?? {}),
    ...(input.hints?.memes ?? []),
    ...(input.hints?.phrases ?? []),
    textExtra
  ].join(" ").toLowerCase();
  if (/virus|medical|contamination|mutation|quarantine|lab|toxic|biohazard|hanta|outbreak|punk|street|spray|graffiti|rebel|void|marker|chaos|vandal/.test(source)) return artTeams.VOID_SKETCH;
  if (/frog|pepe|ribbit|swamp|degen|trench|chart|liquidity|candle|trader|ngmi|fomo/.test(source)) return artTeams.DEGENLAB;
  if (/ghost|spirit|haunt|lonely|memory|archive|forgotten|paper|cursed|skull|crypt|ash|ledger/.test(source)) return artTeams.PAPERGHOST;
  if (/forest|moss|leaf|lantern|storybook|mushroom|organic|wood|garden/.test(source)) return artTeams.MOSSWORKS;
  if (/dog|shib|wif|pup|puppy|cozy|sleep|blanket|snack|soft|plush/.test(source)) return artTeams.SOFTROOM_STUDIO;
  if (/cat|meow|kitty|toy|toast|cute|sticker/.test(source)) return artTeams.SOFTROOM_STUDIO;
  if (/robot|pixel|\bai\b|agent|glitch|signal|network|terminal|broadcast|screen|cyber|vapor|vhs|arcade/.test(source)) return artTeams.PIXEL_REBEL;
  return artTeams.DEGENLAB;
}

export function artTeamForStyle(style: GeneratedStyleProfile): ArtTeamProfile {
  const existing = style.brandDna.artTeam;
  if (existing?.id && artTeams[existing.id]) return artTeams[existing.id];
  return selectArtTeam({
    tokenMint: style.brandDna.mintAddress,
    tokenName: style.brandDna.tokenName,
    tokenSymbol: style.brandDna.tokenSymbol,
    description: style.lore,
    hints: {
      mascotPreference: style.mascot,
      themePreference: style.theme,
      phrases: style.brandDna.memeLanguage
    }
  });
}
