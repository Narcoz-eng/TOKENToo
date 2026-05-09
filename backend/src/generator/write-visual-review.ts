import { mkdirSync, writeFileSync } from "node:fs";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { CommunityContextService } from "./community-context.service";
import type { CreateGenerationRunInput } from "./generator.types";
import { LogoAnalysisService } from "./logo-analysis.service";
import { RarityEngineService } from "./rarity-engine.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";

const inputs: CreateGenerationRunInput[] = [
  {
    tokenMint: "So11111111111111111111111111111111111111112",
    tokenName: "Hantavirus",
    tokenSymbol: "$HANTA",
    logoUri: "https://metadata.example/hanta-logo.png",
    hints: {
      mood: "dark",
      memes: ["patient zero"],
      sourceMetadata: {
        mint: "So11111111111111111111111111111111111111112",
        name: "Hantavirus",
        symbol: "HANTA",
        imageUri: "https://metadata.example/hanta-logo.png",
        riskNotes: ["metadata_uri_absent_identity_inferred_with_confidence"]
      }
    }
  },
  {
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    tokenName: "Agent Reactor",
    tokenSymbol: "$AGENT",
    description: "Autonomous AI agents running reactor nodes, compute raids, terminal chants, and machine guild coordination.",
    logoUri: "https://metadata.example/agent-reactor.png",
    hints: {
      mood: "cyber",
      memes: ["prompt harder"],
      sourceMetadata: {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        name: "Agent Reactor",
        symbol: "AGENT",
        description: "Autonomous AI agents running reactor nodes, compute raids, terminal chants, and machine guild coordination.",
        imageUri: "https://metadata.example/agent-reactor.png",
        socialLinks: { github: "https://github.com/agentreactor" }
      }
    }
  },
  {
    tokenMint: "DezXAZ8z7PnrnRJjz3WsWRq5nGdP3VZ1StSS9wXV6VSh",
    tokenName: "Liminal Wave",
    tokenSymbol: "$VAPR",
    description: "Abstract vaporwave token for empty mall dreams, VHS sunsets, pool tile prophecies, palm grid rituals, and surreal arcade holders.",
    logoUri: "https://metadata.example/liminal-wave.png",
    hints: {
      mood: "cyber",
      memes: ["mall never closes"],
      sourceMetadata: {
        mint: "DezXAZ8z7PnrnRJjz3WsWRq5nGdP3VZ1StSS9wXV6VSh",
        name: "Liminal Wave",
        symbol: "VAPR",
        description: "Abstract vaporwave token for empty mall dreams, VHS sunsets, pool tile prophecies, palm grid rituals, and surreal arcade holders.",
        imageUri: "https://metadata.example/liminal-wave.png"
      }
    }
  }
];

function run() {
  const logo = new LogoAnalysisService();
  const context = new CommunityContextService();
  const styleService = new StyleProfileGeneratorService(new RarityEngineService());
  const traits = new TraitPackGeneratorService(new RarityEngineService());
  const previews = new ArtPreviewGeneratorService();
  const out = "tmp/visual-review";
  const cards: string[] = [];
  const report: unknown[] = [];
  mkdirSync(out, { recursive: true });

  inputs.forEach((input, collectionIndex) => {
    const analysis = logo.analyze(input);
    const community = context.build(input.tokenSymbol ?? "$TOKEN", input.description ?? "", input.hints, analysis);
    const style = styleService.generate(input, analysis, community, 1);
    const pack = traits.generate(style);
    const samples = previews.generate(style, pack, input.tokenMint, 0).filter((item) => item.type === "SAMPLE_NFT");
    report.push({
      collection: style.collection,
      renderer: style.creativeUniverse.creativeDna.visualSystem.rendererFamily,
      engine: style.creativeUniverse.creativeDna.visualSystem.renderingEngine,
      samples: samples.map((sample) => ({
        rarity: sample.metadata.rarity,
        camera: sample.metadata.cameraVariant,
        face: sample.metadata.faceVariant,
        silhouette: sample.metadata.silhouetteVariant,
        event: sample.metadata.eventFrame
      }))
    });

    samples.forEach((sample) => {
      const svg = decodeURIComponent(sample.uri.replace(/^data:image\/svg\+xml;utf8,/, ""));
      const name = `${collectionIndex + 1}-${String(sample.metadata.rarity).toLowerCase()}.svg`;
      writeFileSync(`${out}/${name}`, svg);
      cards.push(`<figure><img src="${name}"><figcaption>${style.collection}<br>${sample.metadata.rarity}<br>${sample.metadata.renderingEngine}</figcaption></figure>`);
    });
  });

  writeFileSync(`${out}/index.html`, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#111;color:#eee;font:14px Arial;padding:20px}main{display:grid;grid-template-columns:repeat(6,180px);gap:16px}figure{margin:0;background:#222;padding:8px}img{width:180px;height:220px;object-fit:contain;background:#000}figcaption{line-height:1.35}</style></head><body><main>${cards.join("")}</main></body></html>`);
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(`${out}/index.html`);
}

run();
