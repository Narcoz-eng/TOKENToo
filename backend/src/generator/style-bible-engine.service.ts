import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { artTeamForStyle } from "./art-team-engine";
import type { GeneratedStyleProfile, PreviewAssetPlan, StyleBiblePlan, StudioExportPlan, TraitCategoryRole, TraitPackPlan } from "./generator.types";
import { escapeXml, svgUri } from "./renderers/svg";
import { TraitCoverageEngineService } from "./trait-coverage-engine.service";

@Injectable()
export class StyleBibleEngineService {
  constructor(@Inject(TraitCoverageEngineService) private readonly traitCoverage: TraitCoverageEngineService) {}

  build(style: GeneratedStyleProfile, pack: TraitPackPlan): StyleBiblePlan {
    const artTeam = artTeamForStyle(style);
    const coverage = this.traitCoverage.build(style, pack);
    const traitCategories = Object.entries(pack.categories).map(([id, values]) => ({
      id,
      label: pack.categoryLabels[id] ?? id,
      role: (Object.entries(pack.categoryRoles).find(([, categoryId]) => categoryId === id)?.[0] ?? "prop") as TraitCategoryRole,
      count: values.length,
      examples: values.slice(0, 10)
    }));
    const traitCounts = Object.fromEntries(Object.entries(pack.categories).map(([id, values]) => [pack.categoryLabels[id] ?? id, values.length]));
    const exportPlan = this.exportPlan(style, pack, coverage.examples.map((example) => example.archetype));
    const plan: StyleBiblePlan = {
      collectionName: style.collection,
      ticker: style.brandDna.tokenSymbol,
      artTeam,
      collectionDNA: this.collectionDna(style),
      tone: this.unique([style.theme, ...style.brandDna.moodCulture.map((mood) => mood.name), ...artTeam.moodVocabulary]).slice(0, 9),
      visualPrinciples: [
        artTeam.shapeLanguage,
        artTeam.anatomyRules,
        artTeam.traitPhilosophy,
        "Rarity examples must prove combinatorial range, not effect stacking.",
        "The same art-team brush, anatomy, and silhouette family stay consistent across all tiers."
      ],
      palette: style.colors,
      lineTextureRules: [artTeam.lineLanguage, artTeam.palettePhilosophy, artTeam.textureDensity, artTeam.detailBudget],
      traitCategories,
      traitCounts,
      moodVocabulary: artTeam.moodVocabulary,
      rarityLadder: coverage.examples,
      rarityPhilosophy: artTeam.rarityEscalationPhilosophy,
      archetypes: this.nativeArchetypes(style),
      layerBreakdown: this.layerBreakdown(style, pack),
      thumbnailReadabilityRules: artTeam.thumbnailReadabilityRules,
      promptPack: this.promptPack(style, pack, coverage.examples.map((example) => example.archetype)),
      exportPlan,
      qaReport: {
        traitCoverageScore: coverage.traitCoverageScore,
        rarityDiversityScore: coverage.traitDiversityScore,
        artTeamConsistencyScore: this.artTeamConsistencyScore(style, coverage),
        collectionNativeArchetypeScore: coverage.globalClicheWarnings.length ? 72 : 94,
        thumbnailReadabilityScore: this.thumbnailScore(style, pack),
        aiGenericRiskScore: coverage.globalClicheWarnings.length ? 42 : 12,
        passed: coverage.traitCoverageScore >= 82 && coverage.traitDiversityScore >= 82 && !coverage.globalClicheWarnings.length,
        issues: [...coverage.repeatedTraitWarnings, ...coverage.globalClicheWarnings]
      }
    };
    plan.exportPlan.styleBibleImage = this.renderStyleBibleImage(plan);
    return plan;
  }

  attach(style: GeneratedStyleProfile, plan: StyleBiblePlan) {
    style.brandDna.styleBible = plan;
    style.brandDna.traitCoverage = {
      traitCoverageScore: plan.qaReport.traitCoverageScore,
      traitDiversityScore: plan.qaReport.rarityDiversityScore,
      rarityVisualDistance: Math.round((plan.qaReport.rarityDiversityScore + plan.qaReport.thumbnailReadabilityScore) / 2),
      accessoryRotationScore: this.rotation(plan.rarityLadder.map((item) => item.prop)),
      outfitRotationScore: this.rotation(plan.rarityLadder.map((item) => item.body)),
      mouthRotationScore: this.rotation(plan.rarityLadder.map((item) => item.mouth)),
      eyeRotationScore: this.rotation(plan.rarityLadder.map((item) => item.eyes)),
      backgroundRotationScore: this.rotation(plan.rarityLadder.map((item) => item.background)),
      silhouetteVariationScore: this.rotation(plan.rarityLadder.map((item) => `${item.base}:${item.head}:${item.posture}`)),
      repeatedTraitWarnings: plan.qaReport.issues.filter((issue) => /reused/i.test(issue)),
      globalClicheWarnings: plan.qaReport.issues.filter((issue) => /cliche|generic|hood|halo|void|staff|cosmic|gold god/i.test(issue)),
      examples: plan.rarityLadder
    };
    style.brandDna.exportPlan = plan.exportPlan;
    style.visualFingerprint = {
      ...style.visualFingerprint,
      artTeam: plan.artTeam.id,
      styleBibleVersion: "studio-bible-v1",
      traitCoverageScore: plan.qaReport.traitCoverageScore,
      rarityDiversityScore: plan.qaReport.rarityDiversityScore,
      nativeArchetypes: plan.archetypes.map((item) => item.name)
    };
  }

  studioAssets(plan: StyleBiblePlan): PreviewAssetPlan[] {
    const asset = (
      type: PreviewAssetPlan["type"],
      label: string,
      uri: string,
      metadata: Record<string, unknown> = {}
    ): PreviewAssetPlan => ({
      type,
      label,
      uri,
      productionAssetStatus: "AI_CONCEPT",
      previewClassification: "AI_CONCEPT_PREVIEW",
      provider: "deterministic-render",
      metadata: {
        artTeam: plan.artTeam.id,
        collectionName: plan.collectionName,
        ...metadata
      },
      generationMetadata: {
        renderer: "style-bible-engine",
        rendererVersion: "studio-bible-v1",
        traitCoverageScore: plan.qaReport.traitCoverageScore,
        rarityDiversityScore: plan.qaReport.rarityDiversityScore
      }
    });

    return [
      asset("STYLE_BIBLE", "Full NFT Studio Bible", plan.exportPlan.styleBibleImage, { module: "style-bible" }),
      asset("TRAIT_CATALOG", "Trait Catalog Sheet", this.renderTraitCatalogSheet(plan), { module: "trait-catalog" }),
      asset("RARITY_LADDER", "Rarity Ladder Sheet", this.renderRarityLadderSheet(plan), { module: "rarity-ladder" }),
      asset("MOOD_SHEET", "Mood / Expression Sheet", this.renderMoodSheet(plan), { module: "mood-sheet" }),
      asset("LAYER_BREAKDOWN", "Layer Breakdown Sheet", this.renderLayerBreakdownSheet(plan), { module: "layer-breakdown" })
    ];
  }

  private exportPlan(style: GeneratedStyleProfile, pack: TraitPackPlan, archetypes: string[]): StudioExportPlan {
    const slug = this.slug(style.collection);
    const hash = createHash("sha256")
      .update(JSON.stringify({ style: style.brandDna, traits: pack.categories, archetypes }))
      .digest("hex");
    return {
      styleBibleJson: `exports/${slug}/style-bible.json`,
      styleBibleImage: `exports/${slug}/style-bible.svg`,
      styleBiblePdf: `exports/${slug}/style-bible.pdf`,
      traitCatalogJson: `exports/${slug}/trait-catalog.json`,
      rarityTableJson: `exports/${slug}/rarity-table.json`,
      metadataTemplate: `exports/${slug}/metadata-template.json`,
      metadataFiles: `exports/${slug}/metadata/`,
      imageManifest: `exports/${slug}/image-manifest.json`,
      layerManifest: `exports/${slug}/layer-manifest.json`,
      collectionConfig: `exports/${slug}/collection-config.json`,
      provenanceHash: hash,
      metaplexCandyMachineConfig: `exports/${slug}/metaplex-candy-machine.json`,
      genericZip: `exports/${slug}/${slug}-studio-export.zip`
    };
  }

  private promptPack(style: GeneratedStyleProfile, pack: TraitPackPlan, archetypes: string[]) {
    const team = artTeamForStyle(style);
    const traitSummary = Object.entries(pack.categories)
      .map(([id, values]) => `${pack.categoryLabels[id] ?? id}: ${values.slice(0, 12).join(", ")}`)
      .join("\n");
    const commonRules = [
      `Create a single NFT collection style-bible sheet for ${style.collection} (${style.brandDna.tokenSymbol}).`,
      `Art team: ${team.name}. Line language: ${team.lineLanguage}. Anatomy: ${team.anatomyRules}.`,
      `Show collection DNA, trait catalog, rarity ladder, mood/expression sheet, layer breakdown, palette, line/texture rules, rarity philosophy, and mythology.`,
      "Use human-designed art direction. This is not a loose character poster, mascot placeholder, UI mock, or generic AI concept.",
      `Trait catalog:\n${traitSummary}`,
      `Collection-native archetypes: ${archetypes.join(", ")}.`,
      "Legendary and Mythic must avoid global hood/halo/void/staff/cosmic deity clichés unless explicitly native to the token."
    ].join("\n");
    return {
      styleBibleImage: `${commonRules}\nArrange as a premium studio bible sheet with labeled panels and trait-rich rarity examples.`,
      traitCatalogSheet: `${commonRules}\nFocus on reusable transparent trait layer families with visible variants per category.`,
      rarityLadder: `${commonRules}\nFocus on six rarity examples with different base/head/eyes/mouth/outfit/prop/background combinations.`,
      moodSheet: `${commonRules}\nFocus on native mood/expression variations through eyes, mouth, posture, gesture, prop, lighting, and background.`,
      layerBreakdown: `${commonRules}\nFocus on deterministic layer order, compatibility notes, transparent exports, and manual cleanup checkpoints.`,
      heroConcept: `${commonRules}\nCreate one hero concept that demonstrates the collection identity without replacing the trait catalog or style bible.`
    };
  }

  private renderStyleBibleImage(plan: StyleBiblePlan) {
    const width = 1536;
    const height = 1024;
    const palette = plan.palette.length ? plan.palette : ["#556b2f", "#111111", "#d8c68a", "#d84f45", "#f3eee2"];
    const paper = "#f4efdf";
    const ink = "#111111";
    const muted = "#5d5a51";
    const accent = palette[2] ?? "#a4d65e";
    const rarityColors: Record<string, string> = {
      Common: "#d8d8b8",
      Uncommon: "#c7ddd2",
      Rare: "#cbd8ec",
      Epic: "#d8c4e8",
      Legendary: "#ead08a",
      Mythic: "#e9b7c8"
    };
    const traitRows = plan.traitCategories.slice(0, 7).map((category, index) => {
      const y = 128 + index * 76;
      const chips = category.examples.slice(0, 8).map((value, chipIndex) => {
        const x = 522 + chipIndex * 48;
        const color = palette[(chipIndex + index) % palette.length] ?? "#999";
        return `<g transform="translate(${x} ${y + 22})">
          <rect width="34" height="34" rx="4" fill="${escapeXml(color)}" stroke="${ink}" stroke-width="2"/>
          <text x="17" y="53" text-anchor="middle" font-size="7" fill="${ink}" font-weight="800">${escapeXml(value).slice(0, 8)}</text>
        </g>`;
      }).join("");
      return `<g>
        <text x="438" y="${y}" font-size="18" font-weight="900" fill="${ink}">${escapeXml(category.label.toUpperCase())} (${category.count})</text>
        ${chips}
      </g>`;
    }).join("");
    const rarities = plan.rarityLadder.map((item, index) => {
      const x = 936 + index * 96;
      const fill = rarityColors[item.rarity] ?? "#ddd";
      return `<g transform="translate(${x} 110)">
        <rect width="88" height="52" fill="${fill}" stroke="${ink}" stroke-width="1.5"/>
        <text x="44" y="22" text-anchor="middle" font-size="13" font-weight="900" fill="${ink}">${escapeXml(item.rarity.toUpperCase())}</text>
        <text x="44" y="40" text-anchor="middle" font-size="10" fill="${ink}" font-weight="800">${escapeXml(item.supplyTarget)}</text>
        <rect y="66" width="88" height="212" fill="#eee6d7" stroke="${ink}" stroke-width="1"/>
        <circle cx="44" cy="130" r="${item.rarity === "Mythic" ? 34 : item.rarity === "Legendary" ? 31 : 27}" fill="${palette[index % palette.length] ?? accent}" stroke="${ink}" stroke-width="5"/>
        <rect x="20" y="170" width="48" height="54" rx="10" fill="${palette[(index + 1) % palette.length] ?? "#333"}" stroke="${ink}" stroke-width="4"/>
        <text x="44" y="300" text-anchor="middle" font-size="8" fill="${ink}" font-weight="900">${escapeXml(item.head).slice(0, 15)}</text>
        <text x="44" y="314" text-anchor="middle" font-size="8" fill="${ink}" font-weight="900">${escapeXml(item.mouth).slice(0, 15)}</text>
        <text x="44" y="328" text-anchor="middle" font-size="8" fill="${ink}" font-weight="900">${escapeXml(item.prop).slice(0, 15)}</text>
      </g>`;
    }).join("");
    const moods = plan.moodVocabulary.slice(0, 9).map((mood, index) => {
      const x = 935 + index * 64;
      return `<g transform="translate(${x} 610)">
        <rect width="52" height="52" fill="#efe8d9" stroke="${ink}"/>
        <circle cx="26" cy="24" r="16" fill="${palette[index % palette.length] ?? accent}" stroke="${ink}" stroke-width="3"/>
        <line x1="18" y1="22" x2="23" y2="${index % 2 ? 18 : 25}" stroke="${ink}" stroke-width="2"/>
        <line x1="30" y1="${index % 3 ? 22 : 18}" x2="36" y2="22" stroke="${ink}" stroke-width="2"/>
        <path d="M18 ${34 + (index % 3)} Q26 ${30 + (index % 4)} 36 ${34 - (index % 3)}" fill="none" stroke="${ink}" stroke-width="2"/>
        <text x="26" y="69" text-anchor="middle" font-size="8" font-weight="900" fill="${ink}">${escapeXml(mood).slice(0, 12)}</text>
      </g>`;
    }).join("");
    const paletteSwatches = plan.palette.slice(0, 10).map((color, index) => {
      const x = 26 + index * 48;
      return `<g transform="translate(${x} 928)">
        <rect width="34" height="34" fill="${escapeXml(color)}" stroke="${ink}" stroke-width="1.5"/>
        <text x="17" y="49" text-anchor="middle" font-size="7" fill="${muted}" font-weight="800">${escapeXml(color)}</text>
      </g>`;
    }).join("");
    const dna = plan.collectionDNA.slice(0, 7).map((line, index) => `<text x="24" y="${165 + index * 28}" font-size="20" fill="${ink}" font-weight="800">${escapeXml(line)}</text>`).join("");
    const principles = plan.visualPrinciples.slice(0, 5).map((line, index) => `<text x="24" y="${642 + index * 24}" font-size="15" fill="${ink}" font-weight="800">• ${escapeXml(line).slice(0, 52)}</text>`).join("");
    const layer = plan.layerBreakdown.slice(0, 7).map((line, index) => `<text x="${50 + index * 112}" y="878" text-anchor="middle" font-size="12" fill="${ink}" font-weight="900">${escapeXml(line.role.toUpperCase())}</text>`).join("");
    const archetypeNotes = plan.archetypes.slice(0, 4).map((item, index) => `<text x="1132" y="${752 + index * 24}" font-size="15" fill="${ink}" font-weight="800">• ${escapeXml(item.name)}: ${escapeXml(item.statusSymbol).slice(0, 35)}</text>`).join("");
    const title = escapeXml(plan.collectionName.toUpperCase());
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-studio-bible="true" data-art-team="${escapeXml(plan.artTeam.id)}">
      <rect width="${width}" height="${height}" fill="${paper}"/>
      <filter id="paperNoise"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" seed="42"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer></filter>
      <rect width="${width}" height="${height}" filter="url(#paperNoise)" opacity="0.45"/>
      <g font-family="Inter, Arial, sans-serif" letter-spacing="0">
        <text x="84" y="74" font-size="54" font-weight="950" fill="${ink}">${title}</text>
        <text x="222" y="108" font-size="18" font-weight="900" fill="${ink}">COLLECTION STYLE BIBLE v1.0</text>
        <rect x="348" y="104" width="130" height="36" fill="${ink}"/>
        <text x="363" y="128" font-size="16" font-weight="950" fill="${accent}">ART TEAM: ${escapeXml(plan.artTeam.id)}</text>
        <rect x="12" y="122" width="206" height="28" fill="${ink}"/><text x="24" y="143" font-size="17" font-weight="950" fill="${paper}">1. COLLECTION DNA</text>
        ${dna}
        <rect x="438" y="54" width="222" height="30" fill="${ink}"/><text x="450" y="76" font-size="18" font-weight="950" fill="${paper}">2. TRAITS CATALOG</text>
        ${traitRows}
        <rect x="936" y="54" width="206" height="30" fill="${ink}"/><text x="948" y="76" font-size="18" font-weight="950" fill="${paper}">3. RARITY LADDER</text>
        ${rarities}
        <rect x="24" y="582" width="174" height="28" fill="${ink}"/><text x="34" y="603" font-size="16" font-weight="950" fill="${paper}">STYLE PRINCIPLES</text>
        ${principles}
        <rect x="936" y="554" width="232" height="30" fill="${ink}"/><text x="948" y="576" font-size="18" font-weight="950" fill="${paper}">4. EXPRESSIONS / MOODS</text>
        ${moods}
        <rect x="16" y="814" width="260" height="30" fill="${ink}"/><text x="28" y="836" font-size="18" font-weight="950" fill="${paper}">5. LAYER BREAKDOWN</text>
        ${layer}
        <rect x="20" y="902" width="170" height="26" fill="${ink}"/><text x="30" y="922" font-size="15" font-weight="950" fill="${paper}">COLOR PALETTE</text>
        ${paletteSwatches}
        <rect x="936" y="706" width="188" height="30" fill="${ink}"/><text x="948" y="728" font-size="18" font-weight="950" fill="${paper}">MYTHOLOGY</text>
        ${archetypeNotes}
        <text x="936" y="958" font-size="15" font-weight="950" fill="${ink}">TRAIT-FIRST • READABLE AT 64PX • COLLECTION-NATIVE • EXPORT READY</text>
      </g>
    </svg>`;
    return svgUri(svg);
  }

  private renderTraitCatalogSheet(plan: StyleBiblePlan) {
    const palette = this.sheetPalette(plan);
    const rows = plan.traitCategories.slice(0, 8).map((category, index) => {
      const y = 150 + index * 92;
      const chips = category.examples.slice(0, 10).map((value, chipIndex) => {
        const x = 338 + chipIndex * 82;
        const fill = palette.colors[(chipIndex + index) % palette.colors.length] ?? palette.accent;
        return `<g transform="translate(${x} ${y - 28})">
          <rect width="58" height="46" rx="5" fill="${escapeXml(fill)}" stroke="${palette.ink}" stroke-width="3"/>
          <path d="M10 30 C18 14 38 13 48 30" fill="none" stroke="${palette.paper}" stroke-width="4" opacity="0.65"/>
          <text x="29" y="68" text-anchor="middle" font-size="9" font-weight="900" fill="${palette.ink}">${escapeXml(value).slice(0, 12)}</text>
        </g>`;
      }).join("");
      return `<g>
        <text x="52" y="${y}" font-size="24" font-weight="950" fill="${palette.ink}">${escapeXml(category.label.toUpperCase())}</text>
        <text x="52" y="${y + 25}" font-size="14" font-weight="900" fill="${palette.muted}">${category.count} variants - ${escapeXml(category.role)} layer</text>
        ${chips}
      </g>`;
    }).join("");
    return this.moduleSheetSvg(plan, "TRAIT CATALOG", "Reusable transparent trait families for deterministic collection assembly.", rows);
  }

  private renderRarityLadderSheet(plan: StyleBiblePlan) {
    const palette = this.sheetPalette(plan);
    const rarityColors: Record<string, string> = {
      Common: "#d8d8b8",
      Uncommon: "#c7ddd2",
      Rare: "#cbd8ec",
      Epic: "#d8c4e8",
      Legendary: "#ead08a",
      Mythic: "#e9b7c8"
    };
    const columns = plan.rarityLadder.map((item, index) => {
      const x = 44 + index * 196;
      const fill = rarityColors[item.rarity] ?? "#ddd";
      const accent = palette.colors[index % palette.colors.length] ?? palette.accent;
      const traits = [
        `Base: ${item.base}`,
        `Head: ${item.head}`,
        `Eyes: ${item.eyes}`,
        `Mouth: ${item.mouth}`,
        `Outfit: ${item.body}`,
        `Prop: ${item.prop}`,
        `World: ${item.background}`,
        `Mood: ${item.mood}`
      ];
      return `<g transform="translate(${x} 150)">
        <rect width="170" height="56" fill="${fill}" stroke="${palette.ink}" stroke-width="2"/>
        <text x="85" y="24" text-anchor="middle" font-size="18" font-weight="950" fill="${palette.ink}">${escapeXml(item.rarity.toUpperCase())}</text>
        <text x="85" y="44" text-anchor="middle" font-size="13" font-weight="900" fill="${palette.ink}">${escapeXml(item.supplyTarget)}</text>
        <rect y="72" width="170" height="302" fill="#efe6d6" stroke="${palette.ink}" stroke-width="2"/>
        <circle cx="85" cy="160" r="${item.rarity === "Mythic" ? 52 : item.rarity === "Legendary" ? 48 : 42}" fill="${accent}" stroke="${palette.ink}" stroke-width="7"/>
        <rect x="42" y="216" width="86" height="84" rx="12" fill="${palette.colors[(index + 1) % palette.colors.length] ?? "#333"}" stroke="${palette.ink}" stroke-width="6"/>
        ${traits.map((trait, traitIndex) => `<text x="14" y="${404 + traitIndex * 24}" font-size="12" font-weight="850" fill="${palette.ink}">${escapeXml(trait).slice(0, 25)}</text>`).join("")}
      </g>`;
    }).join("");
    return this.moduleSheetSvg(plan, "RARITY LADDER", "Each tier proves a different identity, not the same character with stronger effects.", columns);
  }

  private renderMoodSheet(plan: StyleBiblePlan) {
    const palette = this.sheetPalette(plan);
    const moods = plan.moodVocabulary.slice(0, 12).map((mood, index) => {
      const x = 56 + (index % 6) * 190;
      const y = 166 + Math.floor(index / 6) * 250;
      const color = palette.colors[index % palette.colors.length] ?? palette.accent;
      return `<g transform="translate(${x} ${y})">
        <rect width="150" height="168" fill="#efe6d6" stroke="${palette.ink}" stroke-width="2"/>
        <circle cx="75" cy="62" r="42" fill="${escapeXml(color)}" stroke="${palette.ink}" stroke-width="6"/>
        <line x1="47" y1="${58 + (index % 3) * 3}" x2="64" y2="${54 - (index % 2) * 5}" stroke="${palette.ink}" stroke-width="5"/>
        <line x1="86" y1="${55 - (index % 2) * 5}" x2="104" y2="${58 + (index % 4)}" stroke="${palette.ink}" stroke-width="5"/>
        <path d="M45 ${95 + (index % 4) * 3} Q75 ${76 + (index % 5) * 5} 106 ${95 - (index % 3) * 2}" fill="none" stroke="${palette.ink}" stroke-width="5"/>
        <path d="M28 128 C55 ${116 + (index % 3) * 6} 96 ${116 - (index % 2) * 8} 122 128" fill="none" stroke="${palette.ink}" stroke-width="4" opacity="0.5"/>
        <text x="75" y="150" text-anchor="middle" font-size="13" font-weight="950" fill="${palette.ink}">${escapeXml(mood.toUpperCase()).slice(0, 18)}</text>
      </g>`;
    }).join("");
    return this.moduleSheetSvg(plan, "MOOD / EXPRESSION SHEET", `Native vocabulary: ${escapeXml(plan.artTeam.expressionSystem)}`, moods);
  }

  private renderLayerBreakdownSheet(plan: StyleBiblePlan) {
    const palette = this.sheetPalette(plan);
    const layers = plan.layerBreakdown.map((layer, index) => {
      const x = 50 + index * 145;
      const color = palette.colors[index % palette.colors.length] ?? palette.accent;
      return `<g transform="translate(${x} 170)">
        <rect width="108" height="108" rx="8" fill="#efe6d6" stroke="${palette.ink}" stroke-width="2"/>
        <rect x="20" y="28" width="68" height="58" rx="8" fill="${escapeXml(color)}" stroke="${palette.ink}" stroke-width="5" opacity="${0.45 + index * 0.05}"/>
        <text x="54" y="142" text-anchor="middle" font-size="14" font-weight="950" fill="${palette.ink}">${escapeXml(layer.role.toUpperCase())}</text>
        <text x="54" y="164" text-anchor="middle" font-size="10" font-weight="900" fill="${palette.muted}">${escapeXml(layer.exportName)}</text>
      </g>`;
    }).join("");
    const manifest = [
      plan.exportPlan.styleBibleJson,
      plan.exportPlan.traitCatalogJson,
      plan.exportPlan.rarityTableJson,
      plan.exportPlan.metadataTemplate,
      plan.exportPlan.imageManifest,
      plan.exportPlan.layerManifest,
      plan.exportPlan.metaplexCandyMachineConfig,
      plan.exportPlan.genericZip,
      `provenance: ${plan.exportPlan.provenanceHash.slice(0, 24)}...`
    ].map((item, index) => `<text x="62" y="${502 + index * 34}" font-size="20" font-weight="850" fill="${palette.ink}">${escapeXml(item)}</text>`).join("");
    return this.moduleSheetSvg(plan, "LAYER BREAKDOWN + EXPORT MANIFEST", "Deterministic layer order, approval checkpoints, and launch-anywhere export paths.", `${layers}<rect x="44" y="456" width="1120" height="342" fill="#efe6d6" stroke="${palette.ink}" stroke-width="2"/>${manifest}`);
  }

  private moduleSheetSvg(plan: StyleBiblePlan, title: string, subtitle: string, body: string) {
    const palette = this.sheetPalette(plan);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1216" height="832" viewBox="0 0 1216 832" data-studio-bible-module="true" data-art-team="${escapeXml(plan.artTeam.id)}">
      <rect width="1216" height="832" fill="${palette.paper}"/>
      <filter id="paperNoise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="23"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.1"/></feComponentTransfer></filter>
      <rect width="1216" height="832" filter="url(#paperNoise)" opacity="0.45"/>
      <g font-family="Inter, Arial, sans-serif" letter-spacing="0">
        <rect x="28" y="28" width="520" height="46" fill="${palette.ink}"/>
        <text x="48" y="61" font-size="30" font-weight="950" fill="${palette.paper}">${escapeXml(title)}</text>
        <text x="50" y="106" font-size="21" font-weight="950" fill="${palette.ink}">${escapeXml(plan.collectionName.toUpperCase())} / ${escapeXml(plan.artTeam.id)}</text>
        <text x="50" y="130" font-size="15" font-weight="850" fill="${palette.muted}">${subtitle}</text>
        ${body}
        <text x="50" y="808" font-size="14" font-weight="950" fill="${palette.ink}">TRAIT-FIRST - READABLE AT 64PX - COLLECTION-NATIVE - CREATOR APPROVAL REQUIRED</text>
      </g>
    </svg>`;
    return svgUri(svg);
  }

  private sheetPalette(plan: StyleBiblePlan) {
    const colors = plan.palette.length ? plan.palette : ["#556b2f", "#111111", "#d8c68a", "#d84f45", "#f3eee2"];
    return {
      colors,
      paper: "#f4efdf",
      ink: "#111111",
      muted: "#5d5a51",
      accent: colors[2] ?? "#a4d65e"
    };
  }

  private collectionDna(style: GeneratedStyleProfile) {
    return this.unique([
      style.brandDna.lore,
      style.brandDna.raidLanguage[0],
      style.brandDna.memeLanguage[0],
      style.backgroundWorld,
      style.creativeUniverse?.creativeDna?.rarityPhilosophy,
      style.brandDna.legendaryDirection,
      `Mascot: ${style.mascot}`,
      `Ticker: ${style.brandDna.tokenSymbol}`
    ]).slice(0, 8);
  }

  private nativeArchetypes(style: GeneratedStyleProfile) {
    const team = artTeamForStyle(style);
    return team.nativeArchetypes.slice(0, 6).map((name, index) => ({
      name,
      socialFantasy: index % 2 ? `recognized insider of ${style.brandDna.tokenSymbol}` : `community status inside ${style.brandDna.tokenSymbol}`,
      collectibleFantasy: `${name} as a distinct owner identity`,
      powerFantasy: `${style.brandDna.tokenSymbol} culture pushed into a role, not a generic power-up`,
      emotionalFantasy: team.moodVocabulary[index % team.moodVocabulary.length] ?? style.theme,
      statusSymbol: this.unique([style.traitLanguage[index], style.roleNames[index], style.brandDna.roleLanguage[index]]).find(Boolean) ?? name,
      environmentalPrestige: this.unique([style.brandDna.compositionRules[index], style.backgroundWorld, style.raidTheme]).find(Boolean) ?? style.backgroundWorld,
      mythicIdentity: index === 0 ? `${name} becomes the collection-native final form` : `${name} is earned through token-native lore`
    }));
  }

  private layerBreakdown(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const roleOrder: Array<keyof TraitPackPlan["categoryRoles"]> = ["background", "base", "body", "head", "eyes", "mouth", "prop", "aura"];
    return roleOrder.map((role, index) => ({
      role,
      category: pack.categoryLabels[pack.categoryRoles[role] ?? ""] ?? role,
      exportName: `${index.toString().padStart(2, "0")}_${role}.png`,
      rules: role === "base" ? style.brandDna.baseSilhouettes.slice(0, 3).map((item) => `${item.name}: ${item.poseLanguage}`) : [style.brandDna.traitTaxonomy[index]?.description ?? `${role} must stay readable at 64px.`],
      approvalRequired: ["base", "head", "eyes", "mouth", "body"].includes(role)
    }));
  }

  private artTeamConsistencyScore(style: GeneratedStyleProfile, coverage: ReturnType<TraitCoverageEngineService["build"]>) {
    const penalties = coverage.globalClicheWarnings.length * 8 + coverage.repeatedTraitWarnings.length * 3;
    const hasTeam = Boolean(style.brandDna.artTeam?.id);
    return Math.max(55, Math.min(98, (hasTeam ? 96 : 82) - penalties));
  }

  private thumbnailScore(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const categories = Object.keys(pack.categories).length;
    const silhouettes = style.brandDna.baseSilhouettes.length;
    return Math.max(65, Math.min(96, 72 + categories * 2 + silhouettes * 3));
  }

  private rotation(values: string[]) {
    return Math.round((new Set(values.filter(Boolean)).size / Math.max(1, values.length)) * 100);
  }

  private unique(values: Array<string | undefined>) {
    return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
  }

  private slug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "collection";
  }
}
